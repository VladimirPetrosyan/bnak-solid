package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func listenChat(t *testing.T, userID string) *realtimeConn {
	t.Helper()
	c := newRealtimeConn(realtimeHubInstance, nil, userID)
	realtimeHubInstance.register(userID, c)
	t.Cleanup(func() { realtimeHubInstance.unregister(userID, c) })
	return c
}

func TestListMessagesDoesNotMarkRead(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	if _, err := db.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text) VALUES (?, ?, 'text', 'hi')`, thread, tenant); err != nil {
		t.Fatalf("insert message: %v", err)
	}

	conn := listenChat(t, tenant)

	req := httptest.NewRequest(http.MethodGet, "/api/threads/"+thread+"/messages", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleListMessages(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var unread int
	if err := db.QueryRow(`SELECT COUNT(*) FROM messages WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
		thread, owner).Scan(&unread); err != nil {
		t.Fatalf("count unread: %v", err)
	}
	if unread != 1 {
		t.Fatalf("loading history must not mark messages read, want 1 unread, got %d", unread)
	}

	select {
	case raw := <-conn.send:
		t.Fatalf("want no chat.read event from just loading history, got %s", raw)
	default:
	}
}

func TestMarkThreadReadByParticipant(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	if _, err := db.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text) VALUES (?, ?, 'text', 'hi')`, thread, tenant); err != nil {
		t.Fatalf("insert message: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/threads/"+thread+"/read", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var unread int
	if err := db.QueryRow(`SELECT COUNT(*) FROM messages WHERE thread_id = ? AND sender_id != ? AND read_at IS NULL`,
		thread, owner).Scan(&unread); err != nil {
		t.Fatalf("count unread: %v", err)
	}
	if unread != 0 {
		t.Fatalf("unread = %d, want 0", unread)
	}
}

func TestMarkThreadReadIgnoresOwnMessages(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	if _, err := db.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text) VALUES (?, ?, 'text', 'hi')`, thread, owner); err != nil {
		t.Fatalf("insert message: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/threads/"+thread+"/read", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var readAt any
	if err := db.QueryRow(`SELECT read_at FROM messages WHERE thread_id = ? AND sender_id = ?`, thread, owner).Scan(&readAt); err != nil {
		t.Fatalf("select read_at: %v", err)
	}
	if readAt != nil {
		t.Fatalf("own message must stay unread, got read_at = %v", readAt)
	}
}

func TestMarkThreadReadNotifiesSenderOverRealtime(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	if _, err := db.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text) VALUES (?, ?, 'text', 'hi')`, thread, tenant); err != nil {
		t.Fatalf("insert message: %v", err)
	}

	conn := listenChat(t, tenant)

	req := httptest.NewRequest(http.MethodPost, "/api/threads/"+thread+"/read", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	select {
	case raw := <-conn.send:
		var env realtimeEnvelope
		if err := json.Unmarshal(raw, &env); err != nil {
			t.Fatalf("decode event: %v", err)
		}
		if env.Type != "chat.read" {
			t.Fatalf("type = %q, want chat.read", env.Type)
		}
		data, ok := env.Data.(map[string]any)
		if !ok {
			t.Fatalf("data has unexpected shape: %#v", env.Data)
		}
		if data["threadId"] != thread {
			t.Fatalf("threadId = %v, want %v", data["threadId"], thread)
		}
		if data["readerId"] != owner {
			t.Fatalf("readerId = %v, want %v", data["readerId"], owner)
		}
	default:
		t.Fatal("want a chat.read event sent to the message sender")
	}
}

func TestMarkThreadReadSkipsRealtimeWhenNothingToMark(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	conn := listenChat(t, tenant)

	req := httptest.NewRequest(http.MethodPost, "/api/threads/"+thread+"/read", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	select {
	case raw := <-conn.send:
		t.Fatalf("want no chat.read event when there was nothing to mark read, got %s", raw)
	default:
	}
}

func TestMarkThreadReadRejectsStranger(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	stranger := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	req := httptest.NewRequest(http.MethodPost, "/api/threads/"+thread+"/read", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, stranger)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want 403", rec.Code)
	}
}

func TestMarkThreadReadUnknownThreadReturns404(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")

	req := httptest.NewRequest(http.MethodPost, "/api/threads/does-not-exist/read", nil)
	req.SetPathValue("id", "does-not-exist")
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestMarkThreadReadReturns500OnDBError(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)
	if _, err := db.Exec(`DROP TABLE messages`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodPost, "/api/threads/"+thread+"/read", nil)
	req.SetPathValue("id", thread)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMarkThreadRead(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
}
