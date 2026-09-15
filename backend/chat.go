package main

import (
	"database/sql"
	"errors"
	"net/http"
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

		var last Message
		var readAt sql.NullTime
		lastErr := db.QueryRow(`SELECT id, thread_id, sender_id, kind, text, url, name, size, dur, lat, lng, created_at, read_at
			FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1`, t.ID).
			Scan(&last.ID, &last.ThreadID, &last.SenderID, &last.Kind, &last.Text, &last.URL, &last.Name,
				&last.Size, &last.Dur, &last.Lat, &last.Lng, &last.CreatedAt, &readAt)

		var unread int
		db.QueryRow(`SELECT COUNT(*) FROM messages WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
			t.ID, u.ID).Scan(&unread)

		item := map[string]any{"thread": t, "listingId": t.ListingID, "other": other, "unread": unread}
		if lastErr == nil {
			item["lastMessage"] = last
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

	var id string
	err := db.QueryRow(`SELECT id FROM threads WHERE listing_id = ? AND tenant_id = ?`, in.ListingID, u.ID).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		id = newID()
		_, err = db.Exec(`INSERT INTO threads(id, listing_id, tenant_id, owner_id) VALUES (?, ?, ?, ?)`,
			id, in.ListingID, u.ID, ownerID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
	} else if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"threadId": id})
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

	rows, err := db.Query(`SELECT id, thread_id, sender_id, kind, text, url, name, size, dur, lat, lng, created_at, read_at
		FROM messages WHERE thread_id = ? ORDER BY id ASC`, t.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	out := []Message{}
	for rows.Next() {
		var m Message
		var readAt sql.NullTime
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.SenderID, &m.Kind, &m.Text, &m.URL, &m.Name,
			&m.Size, &m.Dur, &m.Lat, &m.Lng, &m.CreatedAt, &readAt); err != nil {
			continue
		}
		if readAt.Valid {
			m.ReadAt = &readAt.Time
		}
		out = append(out, m)
	}
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
	Kind string  `json:"kind"` // text | image | video | audio | file | location
	Text string  `json:"text"`
	URL  string  `json:"url"`
	Name string  `json:"name"`
	Size int64   `json:"size"`
	Dur  int     `json:"dur"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
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
	res, err := db.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text, url, name, size, dur, lat, lng)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		t.ID, u.ID, in.Kind, in.Text, in.URL, in.Name, in.Size, in.Dur, in.Lat, in.Lng)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	row := db.QueryRow(`SELECT id, thread_id, sender_id, kind, text, url, name, size, dur, lat, lng, created_at, read_at
		FROM messages WHERE id = ?`, id)
	var m Message
	var readAt sql.NullTime
	if err := row.Scan(&m.ID, &m.ThreadID, &m.SenderID, &m.Kind, &m.Text, &m.URL, &m.Name, &m.Size, &m.Dur, &m.Lat, &m.Lng, &m.CreatedAt, &readAt); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, m)

	publishChatMessage(m, t)
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
