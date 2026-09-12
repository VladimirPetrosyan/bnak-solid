package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func listingStateTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/realtime/ticket", requireAuth(handleIssueRealtimeTicket))
	mux.HandleFunc("GET /api/realtime", handleRealtimeUpgrade)
	mux.HandleFunc("POST /api/listings/{id}/confirm", requireAuth(handleConfirmListing))
	mux.HandleFunc("POST /api/listings/{id}/mark-taken", requireAuth(handleMarkTaken))
	mux.HandleFunc("POST /api/listings/{id}/return-to-feed", requireAuth(handleReturnToFeed))
	mux.HandleFunc("POST /api/listings/{id}/report", requireAuth(handleReportListing))
	mux.HandleFunc("POST /api/listings/{id}/resolve", requireAuth(handleResolveReport))
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

type listingStateEvent struct {
	Type string `json:"type"`
	Data struct {
		ListingID   string    `json:"listingId"`
		Status      string    `json:"status"`
		ConfirmedAt time.Time `json:"confirmedAt"`
		ExpiresAt   time.Time `json:"expiresAt"`
		UpdatedAt   time.Time `json:"updatedAt"`
	} `json:"data"`
}

func readListingState(t *testing.T, ws *websocket.Conn) listingStateEvent {
	t.Helper()
	ws.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, raw, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("expected listing.state event: %v", err)
	}
	var ev listingStateEvent
	if err := json.Unmarshal(raw, &ev); err != nil {
		t.Fatalf("decode event: %v", err)
	}
	if ev.Type != "listing.state" {
		t.Fatalf("want listing.state, got %q", ev.Type)
	}
	return ev
}

func postAction(t *testing.T, srv *httptest.Server, path, token, body string) *http.Response {
	t.Helper()
	req, _ := http.NewRequest(http.MethodPost, srv.URL+path, strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post %s: %v", path, err)
	}
	return resp
}

func TestListingStateConfirmNotifiesOwnerAndWatcher(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	before := time.Now()
	ownerToken := mustCreateSession(t, owner)
	resp := postAction(t, srv, "/api/listings/"+listing+"/confirm", ownerToken, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("confirm status = %d", resp.StatusCode)
	}

	for _, ws := range []*websocket.Conn{ownerWS, watcherWS} {
		ev := readListingState(t, ws)
		if ev.Data.ListingID != listing || ev.Data.Status != "active" {
			t.Fatalf("unexpected event: %+v", ev)
		}
		if ev.Data.UpdatedAt.Before(before) {
			t.Fatalf("updatedAt not fresh: %+v", ev)
		}
		if ev.Data.ExpiresAt.Sub(ev.Data.ConfirmedAt) != confirmWindow {
			t.Fatalf("expiresAt/confirmedAt window mismatch: %+v", ev)
		}
	}
}

func TestListingStateActiveToFlaggedWatcherGetsFinalEventThenUnsubscribed(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	reporterToken := mustCreateSession(t, reporter)
	resp := postAction(t, srv, "/api/listings/"+listing+"/report", reporterToken, `{"reason":"other","text":""}`)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("report status = %d", resp.StatusCode)
	}

	for _, ws := range []*websocket.Conn{ownerWS, watcherWS} {
		ev := readListingState(t, ws)
		if ev.Data.ListingID != listing || ev.Data.Status != "flagged" {
			t.Fatalf("unexpected event: %+v", ev)
		}
	}
	expectNoEvent(t, watcherWS)

	realtimeHubInstance.mu.Lock()
	n := len(realtimeHubInstance.listingWatchers[listing])
	realtimeHubInstance.mu.Unlock()
	if n != 0 {
		t.Fatalf("watcher was not removed after active->flagged transition, n=%d", n)
	}

	ownerToken := mustCreateSession(t, owner)
	resp = postAction(t, srv, "/api/listings/"+listing+"/resolve", ownerToken, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("resolve status = %d", resp.StatusCode)
	}
	readListingState(t, ownerWS)
	expectNoEvent(t, watcherWS)
}

func TestListingStateStrangerWithoutWatchGetsNothing(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	strangerWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer strangerWS.Close()

	ownerToken := mustCreateSession(t, owner)
	resp := postAction(t, srv, "/api/listings/"+listing+"/confirm", ownerToken, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("confirm status = %d", resp.StatusCode)
	}
	expectNoEvent(t, strangerWS)
}

func TestListingStateNotPublishedOnDBError(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "flagged")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	if _, err := db.Exec(`CREATE TRIGGER force_fail_listing_update BEFORE UPDATE ON listings
		WHEN NEW.id = '` + listing + `' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	ownerToken := mustCreateSession(t, owner)
	resp := postAction(t, srv, "/api/listings/"+listing+"/resolve", ownerToken, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d", resp.StatusCode)
	}
	expectNoEvent(t, ownerWS)

	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "flagged" {
		t.Fatalf("status changed despite forced failure: %s", status)
	}
}

func TestListingStateMarkTakenRollbackNotPublished(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	if _, err := db.Exec(`CREATE TRIGGER force_fail_outcome BEFORE INSERT ON listing_outcomes
		BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	ownerToken := mustCreateSession(t, owner)
	resp := postAction(t, srv, "/api/listings/"+listing+"/mark-taken", ownerToken, `{"source":"bnak"}`)
	resp.Body.Close()
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("want 500, got %d", resp.StatusCode)
	}
	expectNoEvent(t, ownerWS)
}

func TestListingStateReportDismissNoOpNotPublished(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "flagged")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	var report1, report2 int64
	if err := db.QueryRow(`INSERT INTO reports(listing_id, reporter_id, reason, text) VALUES (?, ?, 'other', '') RETURNING id`,
		listing, mustCreateUser(t, "tenant")).Scan(&report1); err != nil {
		t.Fatalf("insert report1: %v", err)
	}
	if err := db.QueryRow(`INSERT INTO reports(listing_id, reporter_id, reason, text) VALUES (?, ?, 'other', '') RETURNING id`,
		listing, mustCreateUser(t, "tenant")).Scan(&report2); err != nil {
		t.Fatalf("insert report2: %v", err)
	}

	id1 := strconv.FormatInt(report1, 10)
	if err := resolveReport(id1, "dismiss", time.Now()); err != nil {
		t.Fatalf("resolveReport: %v", err)
	}
	expectNoEvent(t, ownerWS)

	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "flagged" {
		t.Fatalf("status changed despite remaining pending report: %s", status)
	}
}

func TestListingStateOwnerWatchingOwnListingGetsSingleConfirmEvent(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	sendWatch(t, ownerWS, listing)
	time.Sleep(50 * time.Millisecond)

	ownerToken := mustCreateSession(t, owner)
	resp := postAction(t, srv, "/api/listings/"+listing+"/confirm", ownerToken, "")
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("confirm status = %d", resp.StatusCode)
	}

	readListingState(t, ownerWS)
	expectNoEvent(t, ownerWS)
}

func TestListingStateSweepPublishesPerListingWithoutLeaking(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	ownerA := mustCreateUser(t, "owner")
	ownerB := mustCreateUser(t, "owner")
	listingA := mustCreateListing(t, ownerA, "active")
	listingB := mustCreateListing(t, ownerB, "active")
	listingC := mustCreateListing(t, ownerA, "active")

	past := time.Now().Add(-time.Hour)
	if _, err := db.Exec(`UPDATE listings SET expires_at = ? WHERE id IN (?, ?)`, past, listingA, listingB); err != nil {
		t.Fatalf("backdate expires_at: %v", err)
	}

	watcherA := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherA.Close()
	sendWatch(t, watcherA, listingA)
	watcherB := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherB.Close()
	sendWatch(t, watcherB, listingB)
	watcherC := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherC.Close()
	sendWatch(t, watcherC, listingC)
	time.Sleep(50 * time.Millisecond)

	sweepExpiredListings()

	evA := readListingState(t, watcherA)
	if evA.Data.ListingID != listingA || evA.Data.Status != "archived" {
		t.Fatalf("unexpected event for A: %+v", evA)
	}
	expectNoEvent(t, watcherA)

	evB := readListingState(t, watcherB)
	if evB.Data.ListingID != listingB || evB.Data.Status != "archived" {
		t.Fatalf("unexpected event for B: %+v", evB)
	}
	expectNoEvent(t, watcherB)

	expectNoEvent(t, watcherC)

	var statusC string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listingC).Scan(&statusC)
	if statusC != "active" {
		t.Fatalf("listing C should not have been swept: %s", statusC)
	}
}

func TestSweepExpiredListingsPublishesAfterRowsClosedAndErrorChecked(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	past := time.Now().Add(-time.Hour)
	if _, err := db.Exec(`UPDATE listings SET expires_at = ? WHERE id = ?`, past, listing); err != nil {
		t.Fatalf("backdate expires_at: %v", err)
	}

	watcher := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcher.Close()
	sendWatch(t, watcher, listing)
	time.Sleep(50 * time.Millisecond)

	sweepExpiredListings()

	ev := readListingState(t, watcher)
	if ev.Data.ListingID != listing || ev.Data.Status != "archived" {
		t.Fatalf("unexpected event: %+v", ev)
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status); err != nil {
		t.Fatalf("read back status: %v", err)
	}
	if status != "archived" {
		t.Fatalf("status = %q, want archived — an independent read must see the sweep's final state", status)
	}
}
