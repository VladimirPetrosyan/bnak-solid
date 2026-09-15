package main

import (
	"database/sql"
	"errors"
	"net/http"
	"time"
)

func getOrCreateSupportThread(userID string) (string, error) {
	var id string
	err := db.QueryRow(`SELECT id FROM support_threads WHERE user_id = ?`, userID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", err
	}
	id = newID()
	if _, err := db.Exec(`INSERT INTO support_threads(id, user_id) VALUES (?, ?)`, id, userID); err != nil {
		return "", err
	}
	return id, nil
}

const supportMessageCols = `id, thread_id, sender, kind, text, url, name, size, dur, lat, lng, created_at, read_at`

func scanSupportMessages(rows *sql.Rows) []SupportMessage {
	out := []SupportMessage{}
	defer rows.Close()
	for rows.Next() {
		var m SupportMessage
		var readAt sql.NullTime
		if err := rows.Scan(&m.ID, &m.ThreadID, &m.Sender, &m.Kind, &m.Text, &m.URL, &m.Name, &m.Size, &m.Dur, &m.Lat, &m.Lng, &m.CreatedAt, &readAt); err != nil {
			continue
		}
		if readAt.Valid {
			m.ReadAt = &readAt.Time
		}
		out = append(out, m)
	}
	return out
}

func adminIDs() []string {
	rows, err := db.Query(`SELECT id FROM admins`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	return ids
}

// ---------- GET /api/support/messages ----------

func handleListSupportMessages(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	threadID, err := getOrCreateSupportThread(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	rows, err := db.Query(`SELECT `+supportMessageCols+`
		FROM support_messages WHERE thread_id = ? ORDER BY id ASC`, threadID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, scanSupportMessages(rows))
}

// ---------- POST /api/support/read ----------

func handleMarkSupportRead(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	threadID, err := getOrCreateSupportThread(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := db.Exec(`UPDATE support_messages SET read_at = ? WHERE thread_id = ? AND sender = 'admin' AND read_at IS NULL`,
		time.Now(), threadID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- POST /api/support/messages ----------

type sendSupportMessageReq struct {
	Kind string  `json:"kind"` // text | image | video | audio | file | location
	Text string  `json:"text"`
	URL  string  `json:"url"`
	Name string  `json:"name"`
	Size int64   `json:"size"`
	Dur  int     `json:"dur"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

func handleSendSupportMessage(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	var in sendSupportMessageReq
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
	threadID, err := getOrCreateSupportThread(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	res, err := db.Exec(`INSERT INTO support_messages(thread_id, sender, kind, text, url, name, size, dur, lat, lng)
		VALUES (?, 'user', ?, ?, ?, ?, ?, ?, ?, ?)`,
		threadID, in.Kind, in.Text, in.URL, in.Name, in.Size, in.Dur, in.Lat, in.Lng)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	var m SupportMessage
	var readAt sql.NullTime
	err = db.QueryRow(`SELECT `+supportMessageCols+` FROM support_messages WHERE id = ?`, id).
		Scan(&m.ID, &m.ThreadID, &m.Sender, &m.Kind, &m.Text, &m.URL, &m.Name, &m.Size, &m.Dur, &m.Lat, &m.Lng, &m.CreatedAt, &readAt)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, m)

	realtimeHubInstance.publishToUsers(adminIDs(), "support.message", map[string]any{
		"message":  m,
		"threadId": threadID,
		"user":     map[string]any{"id": u.ID, "name": u.Name, "phone": u.Phone, "ini": u.Ini},
	})
}

// ---------- POST /api/admin/users/{id}/support-thread ----------
// Отдаёт id треда поддержки для этого пользователя, создавая тред, если пользователь ещё
// никогда не писал в поддержку — так админ может первым начать переписку из карточки
// пользователя или из разбора жалобы.

func handleAdminOpenUserThread(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")
	var one int
	if err := db.QueryRow(`SELECT 1 FROM users WHERE id = ?`, userID).Scan(&one); err != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	threadID, err := getOrCreateSupportThread(userID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"threadId": threadID})
}

// ---------- GET /api/admin/support/threads ----------

func handleAdminSupportThreads(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT t.id, t.user_id, t.created_at, u.name, u.phone, u.ini
		FROM support_threads t JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC`)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()

	out := []map[string]any{}
	for rows.Next() {
		var threadID, userID, name, phone, ini string
		var createdAt time.Time
		if err := rows.Scan(&threadID, &userID, &createdAt, &name, &phone, &ini); err != nil {
			continue
		}

		var last SupportMessage
		var readAt sql.NullTime
		lastErr := db.QueryRow(`SELECT `+supportMessageCols+`
			FROM support_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1`, threadID).
			Scan(&last.ID, &last.ThreadID, &last.Sender, &last.Kind, &last.Text, &last.URL, &last.Name, &last.Size, &last.Dur, &last.Lat, &last.Lng, &last.CreatedAt, &readAt)

		var unread int
		db.QueryRow(`SELECT COUNT(*) FROM support_messages WHERE thread_id = ? AND sender = 'user' AND read_at IS NULL`,
			threadID).Scan(&unread)

		item := map[string]any{
			"threadId":  threadID,
			"user":      map[string]any{"id": userID, "name": name, "phone": phone, "ini": ini},
			"createdAt": createdAt,
			"unread":    unread,
		}
		if lastErr == nil {
			item["lastMessage"] = last
		}
		out = append(out, item)
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- GET /api/admin/support/threads/{id}/messages ----------

func handleAdminListSupportMessages(w http.ResponseWriter, r *http.Request) {
	threadID := r.PathValue("id")
	var exists int
	db.QueryRow(`SELECT COUNT(*) FROM support_threads WHERE id = ?`, threadID).Scan(&exists)
	if exists == 0 {
		writeErr(w, http.StatusNotFound, "thread not found")
		return
	}

	db.Exec(`UPDATE support_messages SET read_at = ? WHERE thread_id = ? AND sender = 'user' AND read_at IS NULL`,
		time.Now(), threadID)

	rows, err := db.Query(`SELECT `+supportMessageCols+`
		FROM support_messages WHERE thread_id = ? ORDER BY id ASC`, threadID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, scanSupportMessages(rows))
}

// ---------- POST /api/admin/support/threads/{id}/messages ----------

func handleAdminSendSupportMessage(w http.ResponseWriter, r *http.Request) {
	threadID := r.PathValue("id")
	var userID string
	if err := db.QueryRow(`SELECT user_id FROM support_threads WHERE id = ?`, threadID).Scan(&userID); err != nil {
		writeErr(w, http.StatusNotFound, "thread not found")
		return
	}
	var in sendSupportMessageReq
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
	res, err := db.Exec(`INSERT INTO support_messages(thread_id, sender, kind, text, url, name, size, dur, lat, lng)
		VALUES (?, 'admin', ?, ?, ?, ?, ?, ?, ?, ?)`,
		threadID, in.Kind, in.Text, in.URL, in.Name, in.Size, in.Dur, in.Lat, in.Lng)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	id, _ := res.LastInsertId()
	var m SupportMessage
	var readAt sql.NullTime
	err = db.QueryRow(`SELECT `+supportMessageCols+` FROM support_messages WHERE id = ?`, id).
		Scan(&m.ID, &m.ThreadID, &m.Sender, &m.Kind, &m.Text, &m.URL, &m.Name, &m.Size, &m.Dur, &m.Lat, &m.Lng, &m.CreatedAt, &readAt)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, m)

	realtimeHubInstance.publishToUsers([]string{userID}, "support.message", map[string]any{
		"message":  m,
		"threadId": threadID,
	})
}

// ---------- POST /api/admin/realtime/ticket ----------

func handleAdminIssueRealtimeTicket(w http.ResponseWriter, r *http.Request) {
	a := adminFromCtx(r.Context())
	ticket, err := realtimeTickets.issue(a.ID, time.Now())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ticket error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ticket": ticket, "expiresIn": int(realtimeTicketTTL.Seconds())})
}
