package main

import (
	"database/sql"
	"errors"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

// ---------- GET /api/threads ----------

func handleListThreads(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	rows, err := db.Query(`SELECT id, listing_id, tenant_id, owner_id, created_at FROM threads
		WHERE tenant_id = ? OR owner_id = ? ORDER BY created_at DESC`, u.ID, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	threads := []Thread{}
	for rows.Next() {
		var t Thread
		if err := rows.Scan(&t.ID, &t.ListingID, &t.TenantID, &t.OwnerID, &t.CreatedAt); err == nil {
			threads = append(threads, t)
		}
	}
	rows.Close() // закрываем курсор до вложенных запросов ниже — та же ловушка, что и в drainListings

	out := []map[string]any{}
	for _, t := range threads {
		otherID := t.OwnerID
		if u.ID == t.OwnerID {
			otherID = t.TenantID
		}
		var other User
		db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, otherID).
			Scan(&other.ID, &other.Phone, &other.Name, &other.Role, &other.Ini, &other.CreatedAt)

		last, lastErr := scanMessage(db.QueryRow(`SELECT `+messageCols+` FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1`, t.ID))

		var unread int
		db.QueryRow(`SELECT COUNT(*) FROM messages WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
			t.ID, u.ID).Scan(&unread)

		item := map[string]any{"thread": t, "listingId": t.ListingID, "other": other, "unread": unread}
		if lastErr == nil {
			item["lastMessage"] = withBookings([]Message{last})[0]
		}
		out = append(out, item)
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- POST /api/threads ----------

type openThreadReq struct {
	ListingID string `json:"listingId"`
}

func handleOpenThread(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	var in openThreadReq
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	var ownerID string
	if err := db.QueryRow(`SELECT owner_id FROM listings WHERE id = ?`, in.ListingID).Scan(&ownerID); err != nil {
		writeErr(w, http.StatusNotFound, "listing not found")
		return
	}
	if ownerID == u.ID {
		writeErr(w, http.StatusBadRequest, "cannot message yourself")
		return
	}

	id, err := ensureThread(db, in.ListingID, u.ID, ownerID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"threadId": id})
}

func ensureThread(q dbtx, listingID, tenantID, ownerID string) (string, error) {
	var id string
	err := q.QueryRow(`SELECT id FROM threads WHERE listing_id = ? AND tenant_id = ?`, listingID, tenantID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		id = newID()
		_, err = q.Exec(`INSERT INTO threads(id, listing_id, tenant_id, owner_id) VALUES (?, ?, ?, ?)`, id, listingID, tenantID, ownerID)
	}
	return id, err
}

const messageCols = `id, thread_id, sender_id, kind, text, url, name, size, dur, lat, lng, created_at, read_at, booking_id, waveform, transcript`

func scanMessage(row interface{ Scan(...any) error }) (Message, error) {
	var m Message
	var readAt sql.NullTime
	err := row.Scan(&m.ID, &m.ThreadID, &m.SenderID, &m.Kind, &m.Text, &m.URL, &m.Name,
		&m.Size, &m.Dur, &m.Lat, &m.Lng, &m.CreatedAt, &readAt, &m.BookingID, &m.Waveform, &m.Transcript)
	if readAt.Valid {
		m.ReadAt = &readAt.Time
	}
	return m, err
}

// withBookings прикладывает к сообщениям kind=booking актуальное состояние брони, чтобы
// чат рисовал карточку «запрос / подтверждено / отклонено» без отдельного запроса.
func withBookings(msgs []Message) []Message {
	cache := map[string]*Booking{}
	for i := range msgs {
		id := msgs[i].BookingID
		if id == "" {
			continue
		}
		if _, ok := cache[id]; !ok {
			cache[id], _ = loadBooking(db, id)
		}
		msgs[i].Booking = cache[id]
	}
	return msgs
}

// ---------- участник треда ----------

func threadOr403(w http.ResponseWriter, r *http.Request) (*Thread, bool) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	var t Thread
	err := db.QueryRow(`SELECT id, listing_id, tenant_id, owner_id, created_at FROM threads WHERE id = ?`, id).
		Scan(&t.ID, &t.ListingID, &t.TenantID, &t.OwnerID, &t.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "thread not found")
		return nil, false
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return nil, false
	}
	if t.TenantID != u.ID && t.OwnerID != u.ID {
		writeErr(w, http.StatusForbidden, "not a participant")
		return nil, false
	}
	return &t, true
}

// ---------- GET /api/threads/{id}/messages ----------

func handleListMessages(w http.ResponseWriter, r *http.Request) {
	t, ok := threadOr403(w, r)
	if !ok {
		return
	}
	u := userFromCtx(r.Context())

	readAt := time.Now()
	if res, err := db.Exec(`UPDATE messages SET read_at = ? WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
		readAt, t.ID, u.ID); err == nil {
		if n, _ := res.RowsAffected(); n > 0 {
			publishChatRead(t, u.ID, readAt)
		}
	}

	rows, err := db.Query(`SELECT `+messageCols+` FROM messages WHERE thread_id = ? ORDER BY id ASC`, t.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := []Message{}
	for rows.Next() {
		if m, err := scanMessage(rows); err == nil {
			out = append(out, m)
		}
	}
	rows.Close()
	out = withBookings(out)
	if lang := requestLang(r); lang != "" {
		texts := make([]string, 0, len(out))
		idx := make([]int, 0, len(out))
		for i, m := range out {
			if m.Kind == "text" && m.Text != "" && userLang(m.SenderID) != lang {
				texts = append(texts, m.Text)
				idx = append(idx, i)
			}
		}
		if len(texts) > 0 {
			translated := translateBatch(texts, lang)
			for j, i := range idx {
				out[i].Text = translated[j]
			}
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- POST /api/threads/{id}/messages ----------

type sendMessageReq struct {
	Kind     string  `json:"kind"` // text | image | video | audio | file | location
	Text     string  `json:"text"`
	URL      string  `json:"url"`
	Name     string  `json:"name"`
	Size     int64   `json:"size"`
	Dur      int     `json:"dur"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Waveform string  `json:"waveform"`
}

func handleSendMessage(w http.ResponseWriter, r *http.Request) {
	t, ok := threadOr403(w, r)
	if !ok {
		return
	}
	u := userFromCtx(r.Context())
	var in sendMessageReq
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if in.Kind == "" {
		in.Kind = "text"
	}
	if in.Kind == "text" && in.Text == "" {
		writeErr(w, http.StatusBadRequest, "empty message")
		return
	}
	if in.Kind == "booking" {
		writeErr(w, http.StatusBadRequest, "invalid kind")
		return
	}
	res, err := db.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text, url, name, size, dur, lat, lng, waveform)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, u.ID, in.Kind, in.Text, in.URL, in.Name, in.Size, in.Dur, in.Lat, in.Lng, in.Waveform)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	m, err := scanMessage(db.QueryRow(`SELECT `+messageCols+` FROM messages WHERE id = ?`, id))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, m)

	publishChatMessage(m, t)
}

// ---------- POST /api/threads/{id}/messages/{mid}/transcript ----------
// Расшифровка голосового сообщения по кнопке (не автоматически на каждое голосовое —
// платный запрос к Yandex SpeechKit). Результат кэшируется в messages.transcript,
// повторное нажатие кнопки его не пересчитывает.

func handleTranscribeMessage(w http.ResponseWriter, r *http.Request) {
	t, ok := threadOr403(w, r)
	if !ok {
		return
	}
	id, err := strconv.ParseInt(r.PathValue("mid"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "bad message id")
		return
	}
	var threadID, kind, url, transcript string
	err = db.QueryRow(`SELECT thread_id, kind, url, transcript FROM messages WHERE id = ?`, id).
		Scan(&threadID, &kind, &url, &transcript)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "message not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if threadID != t.ID {
		writeErr(w, http.StatusForbidden, "not a participant")
		return
	}
	if kind != "audio" {
		writeErr(w, http.StatusBadRequest, "not a voice message")
		return
	}
	if transcript != "" {
		writeJSON(w, http.StatusOK, map[string]string{"transcript": transcript})
		return
	}
	text, err := transcribeAudioFile(filepath.Join(uploadsDir, strings.TrimPrefix(url, "/uploads/")))
	if err != nil {
		logf("transcribe message %d: %v", id, err)
		writeErr(w, http.StatusInternalServerError, "transcribe_failed")
		return
	}
	db.Exec(`UPDATE messages SET transcript = ? WHERE id = ?`, text, id)
	writeJSON(w, http.StatusOK, map[string]string{"transcript": text})
}

// publishChatMessage рассылает новое сообщение обоим участникам треда по WebSocket,
// переводя текст под сохранённый язык интерфейса каждого получателя (users.lang, см.
// auth.go withUser) — получатель видит перевод сразу, без повторного запроса. Если язык
// получателя совпадает с языком отправителя, перевод не запрашивается: текст почти
// наверняка уже на нужном языке, а лишний вызов Yandex Translate только стоил бы денег.
func publishChatMessage(m Message, t *Thread) {
	senderLang := userLang(m.SenderID)
	for _, uid := range []string{t.TenantID, t.OwnerID} {
		out := m
		if m.Kind == "text" && m.Text != "" {
			if lang := userLang(uid); lang != "" && lang != senderLang {
				out.Text = translateCached(m.Text, lang)
			}
		}
		realtimeHubInstance.publishToUsers([]string{uid}, "chat.message", map[string]any{
			"message":   out,
			"threadId":  t.ID,
			"listingId": t.ListingID,
			"tenantId":  t.TenantID,
			"ownerId":   t.OwnerID,
		})
	}
}

func handleMarkThreadRead(w http.ResponseWriter, r *http.Request) {
	t, ok := threadOr403(w, r)
	if !ok {
		return
	}
	u := userFromCtx(r.Context())
	readAt := time.Now()
	res, err := db.Exec(`UPDATE messages SET read_at = ? WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
		readAt, t.ID, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if n, _ := res.RowsAffected(); n > 0 {
		publishChatRead(t, u.ID, readAt)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// publishChatRead уведомляет отправителя, что участник reader прочитал его сообщения в
// треде t, чтобы галочки «прочитано» у отправителя обновились сразу, без перезагрузки.
func publishChatRead(t *Thread, readerID string, readAt time.Time) {
	otherID := t.TenantID
	if readerID == t.TenantID {
		otherID = t.OwnerID
	}
	realtimeHubInstance.publishToUsers([]string{otherID}, "chat.read", map[string]any{
		"threadId": t.ID,
		"readerId": readerID,
		"readAt":   readAt,
	})
}
