package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func supportRequest(method, path, body string, user *User, admin *Admin) *http.Request {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	ctx := r.Context()
	if user != nil {
		ctx = context.WithValue(ctx, ctxUserKey, user)
	}
	if admin != nil {
		ctx = context.WithValue(ctx, ctxAdminCtxKey, admin)
	}
	return r.WithContext(ctx)
}

func TestSupportUserSendCreatesThreadAndMessage(t *testing.T) {
	setupTestDB(t)
	uid := mustCreateUser(t, "tenant")
	u := &User{ID: uid, Name: "Ани"}

	w := httptest.NewRecorder()
	r := supportRequest("POST", "/api/support/messages", `{"text":"Привет"}`, u, nil)
	handleSendSupportMessage(w, r)
	if w.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", w.Code, w.Body.String())
	}

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM support_threads WHERE user_id = ?`, uid).Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly one thread, got %d", count)
	}
}

func TestSupportUserSendTwiceReusesThread(t *testing.T) {
	setupTestDB(t)
	uid := mustCreateUser(t, "tenant")
	u := &User{ID: uid}

	handleSendSupportMessage(httptest.NewRecorder(), supportRequest("POST", "/api/support/messages", `{"text":"один"}`, u, nil))
	handleSendSupportMessage(httptest.NewRecorder(), supportRequest("POST", "/api/support/messages", `{"text":"два"}`, u, nil))

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM support_threads WHERE user_id = ?`, uid).Scan(&count)
	if count != 1 {
		t.Fatalf("want thread reused, got %d threads", count)
	}
}

func TestSupportEmptyMessageRejected(t *testing.T) {
	setupTestDB(t)
	uid := mustCreateUser(t, "tenant")
	w := httptest.NewRecorder()
	handleSendSupportMessage(w, supportRequest("POST", "/api/support/messages", `{"text":""}`, &User{ID: uid}, nil))
	if w.Code != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", w.Code)
	}
}

func TestAdminSeesSupportThreadWithUnreadCount(t *testing.T) {
	setupTestDB(t)
	uid := mustCreateUser(t, "tenant")
	handleSendSupportMessage(httptest.NewRecorder(), supportRequest("POST", "/api/support/messages", `{"text":"нужна помощь"}`, &User{ID: uid}, nil))

	w := httptest.NewRecorder()
	handleAdminSupportThreads(w, httptest.NewRequest("GET", "/api/admin/support/threads", nil))
	if w.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", w.Code)
	}
	var out []map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("want 1 thread, got %d", len(out))
	}
	if int(out[0]["unread"].(float64)) != 1 {
		t.Fatalf("want unread=1, got %v", out[0]["unread"])
	}
}

func TestAdminReplyAndUserReadFlow(t *testing.T) {
	setupTestDB(t)
	uid := mustCreateUser(t, "tenant")
	u := &User{ID: uid}
	admin := &Admin{ID: mustCreateAdmin(t)}

	handleSendSupportMessage(httptest.NewRecorder(), supportRequest("POST", "/api/support/messages", `{"text":"вопрос"}`, u, nil))

	var threadID string
	db.QueryRow(`SELECT id FROM support_threads WHERE user_id = ?`, uid).Scan(&threadID)

	replyW := httptest.NewRecorder()
	replyReq := supportRequest("POST", "/api/admin/support/threads/"+threadID+"/messages", `{"text":"чем помочь?"}`, nil, admin)
	replyReq.SetPathValue("id", threadID)
	handleAdminSendSupportMessage(replyW, replyReq)
	if replyW.Code != http.StatusCreated {
		t.Fatalf("want 201, got %d: %s", replyW.Code, replyW.Body.String())
	}

	listW := httptest.NewRecorder()
	handleListSupportMessages(listW, supportRequest("GET", "/api/support/messages", "", u, nil))
	var msgs []SupportMessage
	if err := json.Unmarshal(listW.Body.Bytes(), &msgs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(msgs) != 2 {
		t.Fatalf("want 2 messages, got %d", len(msgs))
	}
	if msgs[1].Sender != "admin" || msgs[1].Text != "чем помочь?" {
		t.Fatalf("unexpected admin message: %+v", msgs[1])
	}

	var unreadAfterList int
	db.QueryRow(`SELECT COUNT(*) FROM support_messages WHERE thread_id = ? AND sender = 'admin' AND read_at IS NULL`, threadID).Scan(&unreadAfterList)
	if unreadAfterList != 1 {
		t.Fatalf("listing messages must not mark them read, got %d unread", unreadAfterList)
	}

	handleMarkSupportRead(httptest.NewRecorder(), supportRequest("POST", "/api/support/read", "", u, nil))

	var unread int
	db.QueryRow(`SELECT COUNT(*) FROM support_messages WHERE thread_id = ? AND sender = 'admin' AND read_at IS NULL`, threadID).Scan(&unread)
	if unread != 0 {
		t.Fatalf("want admin message marked read after explicit read call, got %d unread", unread)
	}
}

func TestAdminSupportThreadNotFound(t *testing.T) {
	setupTestDB(t)
	w := httptest.NewRecorder()
	req := httptest.NewRequest("POST", "/api/admin/support/threads/missing/messages", strings.NewReader(`{"text":"hi"}`))
	req.SetPathValue("id", "missing")
	handleAdminSendSupportMessage(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("want 404, got %d", w.Code)
	}
}
