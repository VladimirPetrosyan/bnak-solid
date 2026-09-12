package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func realtimeTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/realtime/ticket", requireAuth(handleIssueRealtimeTicket))
	mux.HandleFunc("GET /api/realtime", handleRealtimeUpgrade)
	mux.HandleFunc("POST /api/threads/{id}/messages", requireAuth(handleSendMessage))
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func setCORS(t *testing.T, dev bool, origin string) {
	t.Helper()
	prevDev, prevOrigin := devMode, corsOrigin
	devMode, corsOrigin = dev, origin
	t.Cleanup(func() { devMode, corsOrigin = prevDev, prevOrigin })
}

func issueTicket(t *testing.T, srv *httptest.Server, token string) string {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/api/realtime/ticket", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("ticket request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("ticket status = %d", resp.StatusCode)
	}
	var body struct {
		Ticket string `json:"ticket"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode ticket: %v", err)
	}
	return body.Ticket
}

func dialRealtime(srv *httptest.Server, ticket, origin string) (*websocket.Conn, *http.Response, error) {
	wsURL := "ws" + strings.TrimPrefix(srv.URL, "http") + "/api/realtime?ticket=" + url.QueryEscape(ticket)
	headers := http.Header{}
	if origin != "" {
		headers.Set("Origin", origin)
	}
	return websocket.DefaultDialer.Dial(wsURL, headers)
}

func readReady(t *testing.T, ws *websocket.Conn) {
	t.Helper()
	ws.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, raw, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("read ready event: %v", err)
	}
	var env realtimeEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		t.Fatalf("decode ready event: %v", err)
	}
	if env.Type != "realtime.ready" {
		t.Fatalf("want realtime.ready first, got %q", env.Type)
	}
}

func mustCreateSession(t *testing.T, userID string) string {
	t.Helper()
	token, err := createSession(userID)
	if err != nil {
		t.Fatalf("createSession: %v", err)
	}
	return token
}

func mustCreateThread(t *testing.T, listingID, tenantID, ownerID string) string {
	t.Helper()
	id := newID()
	if _, err := db.Exec(`INSERT INTO threads(id, listing_id, tenant_id, owner_id) VALUES (?, ?, ?, ?)`,
		id, listingID, tenantID, ownerID); err != nil {
		t.Fatalf("create thread: %v", err)
	}
	return id
}

func TestRealtimeTicketIssueRequiresAuth(t *testing.T) {
	setupTestDB(t)
	srv := realtimeTestServer(t)
	resp, err := http.Post(srv.URL+"/api/realtime/ticket", "application/json", nil)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("want 401, got %d", resp.StatusCode)
	}
}

func TestRealtimeUpgradeRejectsUnknownTicket(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)

	_, resp, err := dialRealtime(srv, "bogus-ticket", "http://localhost:5173")
	if err == nil {
		t.Fatalf("want dial error for unknown ticket")
	}
	if resp == nil || resp.StatusCode != http.StatusUnauthorized {
		status := 0
		if resp != nil {
			status = resp.StatusCode
		}
		t.Fatalf("want 401, got %d", status)
	}
}

func TestRealtimeUpgradeRejectsEmptyTicket(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)

	_, resp, err := dialRealtime(srv, "", "http://localhost:5173")
	if err == nil {
		t.Fatalf("want dial error for empty ticket")
	}
	if resp == nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("want 401 for empty ticket")
	}
}

func TestRealtimeUpgradeRejectsBadOriginInProduction(t *testing.T) {
	setupTestDB(t)
	setCORS(t, false, "https://hayhome.am")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	_, resp, err := dialRealtime(srv, ticket, "https://evil.example")
	if err == nil {
		t.Fatalf("want dial error for disallowed origin")
	}
	if resp == nil || resp.StatusCode != http.StatusForbidden {
		t.Fatalf("want 403 for disallowed origin")
	}
}

func TestRealtimeUpgradeRejectsWildcardInProduction(t *testing.T) {
	setupTestDB(t)
	setCORS(t, false, "*")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	_, resp, err := dialRealtime(srv, ticket, "https://anything.example")
	if err == nil {
		t.Fatalf("want dial error: wildcard origin must be rejected in production")
	}
	if resp == nil || resp.StatusCode != http.StatusForbidden {
		t.Fatalf("want 403 for wildcard origin in production")
	}
}

func TestRealtimeUpgradeDevAllowsLocalhostAnyPort(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	ws, _, err := dialRealtime(srv, ticket, "http://127.0.0.1:4000")
	if err != nil {
		t.Fatalf("dev localhost origin should be allowed: %v", err)
	}
	defer ws.Close()
	readReady(t, ws)
}

func TestRealtimeUpgradeSuccessSendsReadyFirst(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	ws, _, err := dialRealtime(srv, ticket, "http://localhost:5173")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer ws.Close()
	readReady(t, ws)
}

func TestRealtimeTicketCannotBeReplayedForSecondUpgrade(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	ws1, _, err := dialRealtime(srv, ticket, "http://localhost:5173")
	if err != nil {
		t.Fatalf("first dial: %v", err)
	}
	defer ws1.Close()
	readReady(t, ws1)

	_, resp, err := dialRealtime(srv, ticket, "http://localhost:5173")
	if err == nil {
		t.Fatalf("replayed ticket must not open a second connection")
	}
	if resp == nil || resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("want 401 on replay")
	}
}

func TestRealtimeUnregisterOnClientClose(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	ws, _, err := dialRealtime(srv, ticket, "http://localhost:5173")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	readReady(t, ws)
	ws.Close()

	deadline := time.Now().Add(2 * time.Second)
	for {
		realtimeHubInstance.mu.Lock()
		n := len(realtimeHubInstance.conns[owner])
		realtimeHubInstance.mu.Unlock()
		if n == 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("connection was not unregistered after client close")
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestRealtimeSlowClientIsDisconnected(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)
	owner := mustCreateUser(t, "owner")
	token := mustCreateSession(t, owner)
	ticket := issueTicket(t, srv, token)

	ws, _, err := dialRealtime(srv, ticket, "http://localhost:5173")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer ws.Close()
	readReady(t, ws)

	padding := strings.Repeat("x", 4096)
	deadline := time.Now().Add(10 * time.Second)
	disconnected := false
	for i := 0; !disconnected && time.Now().Before(deadline); i++ {
		realtimeHubInstance.publishToUsers([]string{owner}, "test.flood", map[string]string{"pad": padding})
		if i%20 == 0 {
			realtimeHubInstance.mu.Lock()
			disconnected = len(realtimeHubInstance.conns[owner]) == 0
			realtimeHubInstance.mu.Unlock()
		}
	}
	if !disconnected {
		t.Fatalf("slow client was not disconnected after send queue overflow")
	}
}

func TestChatMessageDeliveredToBothParticipantsAllTabs(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)

	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	stranger := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	dial := func(userID string) *websocket.Conn {
		token := mustCreateSession(t, userID)
		ticket := issueTicket(t, srv, token)
		ws, _, err := dialRealtime(srv, ticket, "http://localhost:5173")
		if err != nil {
			t.Fatalf("dial: %v", err)
		}
		readReady(t, ws)
		return ws
	}

	ownerWS := dial(owner)
	defer ownerWS.Close()
	tenantWS1 := dial(tenant)
	defer tenantWS1.Close()
	tenantWS2 := dial(tenant)
	defer tenantWS2.Close()
	strangerWS := dial(stranger)
	defer strangerWS.Close()

	senderToken := mustCreateSession(t, tenant)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/api/threads/"+thread+"/messages",
		strings.NewReader(`{"kind":"text","text":"hello"}`))
	req.Header.Set("Authorization", "Bearer "+senderToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("want 201, got %d", resp.StatusCode)
	}

	for _, ws := range []*websocket.Conn{ownerWS, tenantWS1, tenantWS2} {
		ws.SetReadDeadline(time.Now().Add(2 * time.Second))
		_, raw, err := ws.ReadMessage()
		if err != nil {
			t.Fatalf("expected chat.message event: %v", err)
		}
		var env struct {
			Type string `json:"type"`
			Data struct {
				ThreadID string `json:"threadId"`
				Message  struct {
					Text string `json:"text"`
				} `json:"message"`
			} `json:"data"`
		}
		if err := json.Unmarshal(raw, &env); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if env.Type != "chat.message" || env.Data.ThreadID != thread || env.Data.Message.Text != "hello" {
			t.Fatalf("unexpected event: %+v", env)
		}
	}

	strangerWS.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
	if _, _, err := strangerWS.ReadMessage(); err == nil {
		t.Fatalf("stranger must not receive chat.message")
	}
}

func TestChatMessageNotPublishedOnValidationError(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := realtimeTestServer(t)

	owner := mustCreateUser(t, "owner")
	tenant := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	thread := mustCreateThread(t, listing, tenant, owner)

	ownerToken := mustCreateSession(t, owner)
	ownerTicket := issueTicket(t, srv, ownerToken)
	ownerWS, _, err := dialRealtime(srv, ownerTicket, "http://localhost:5173")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer ownerWS.Close()
	readReady(t, ownerWS)

	senderToken := mustCreateSession(t, tenant)
	req, _ := http.NewRequest(http.MethodPost, srv.URL+"/api/threads/"+thread+"/messages",
		strings.NewReader(`{"kind":"text","text":""}`))
	req.Header.Set("Authorization", "Bearer "+senderToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("send message: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("want 400, got %d", resp.StatusCode)
	}

	ownerWS.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
	if _, _, err := ownerWS.ReadMessage(); err == nil {
		t.Fatalf("validation error must not publish chat.message")
	}
}
