package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func listingWatchTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/realtime/ticket", requireAuth(handleIssueRealtimeTicket))
	mux.HandleFunc("GET /api/realtime", handleRealtimeUpgrade)
	mux.HandleFunc("GET /api/listings/{id}", withUser(handleGetListing))
	mux.HandleFunc("POST /api/favorites/{id}", requireAuth(handleAddFavorite))
	mux.HandleFunc("DELETE /api/favorites/{id}", requireAuth(handleRemoveFavorite))
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func dialWatcher(t *testing.T, srv *httptest.Server, userID string) *websocket.Conn {
	t.Helper()
	token := mustCreateSession(t, userID)
	ticket := issueTicket(t, srv, token)
	ws, _, err := dialRealtime(srv, ticket, "http://localhost:5173")
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	readReady(t, ws)
	return ws
}

func sendWatch(t *testing.T, ws *websocket.Conn, listingID string) {
	t.Helper()
	frame, _ := json.Marshal(map[string]any{"type": "listing.watch", "data": map[string]any{"listingId": listingID}})
	if err := ws.WriteMessage(websocket.TextMessage, frame); err != nil {
		t.Fatalf("send watch: %v", err)
	}
}

type statsEvent struct {
	Type string `json:"type"`
	Data struct {
		ListingID string `json:"listingId"`
		Views     *int   `json:"views"`
		Favorites *int   `json:"favorites"`
	} `json:"data"`
}

func readStatsEvent(t *testing.T, ws *websocket.Conn) statsEvent {
	t.Helper()
	ws.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, raw, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("expected listing.stats event: %v", err)
	}
	var ev statsEvent
	if err := json.Unmarshal(raw, &ev); err != nil {
		t.Fatalf("decode event: %v", err)
	}
	if ev.Type != "listing.stats" {
		t.Fatalf("want listing.stats, got %q", ev.Type)
	}
	return ev
}

func expectNoEvent(t *testing.T, ws *websocket.Conn) {
	t.Helper()
	ws.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
	if _, raw, err := ws.ReadMessage(); err == nil {
		t.Fatalf("expected no event, got %s", raw)
	}
}

func getListing(t *testing.T, srv *httptest.Server, listingID, token, browserID string) {
	t.Helper()
	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/api/listings/"+listingID, nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	if browserID != "" {
		req.Header.Set(browserIDHeader, browserID)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("get listing: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("get listing status = %d", resp.StatusCode)
	}
}

func toggleFavorite(t *testing.T, srv *httptest.Server, listingID, userID string, add bool) *http.Response {
	t.Helper()
	token := mustCreateSession(t, userID)
	method := http.MethodDelete
	if add {
		method = http.MethodPost
	}
	req, _ := http.NewRequest(method, srv.URL+"/api/favorites/"+listingID, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("favorite request: %v", err)
	}
	return resp
}

func TestCanWatchListingActiveAllowsAnyone(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	if !canWatchListing(listing, "") {
		t.Fatalf("anonymous requester must be able to watch an active listing")
	}
	other := mustCreateUser(t, "tenant")
	if !canWatchListing(listing, other) {
		t.Fatalf("any authenticated requester must be able to watch an active listing")
	}
}

func TestCanWatchListingOwnerAllowedRegardlessOfStatus(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "pending")
	if !canWatchListing(listing, owner) {
		t.Fatalf("owner must be able to watch their own non-active listing")
	}
}

func TestCanWatchListingOthersInactiveDenied(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	other := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "pending")
	if canWatchListing(listing, other) {
		t.Fatalf("stranger must not be able to watch someone else's non-active listing")
	}
	if canWatchListing(listing, "") {
		t.Fatalf("anonymous must not be able to watch a non-active listing")
	}
}

func TestCanWatchListingUnknownDenied(t *testing.T) {
	setupTestDB(t)
	if canWatchListing("does-not-exist", "") {
		t.Fatalf("unknown listing must not be watchable")
	}
}

func TestListingWatchDeliversViewEventToOwnerAndWatcher(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, viewer)
	getListing(t, srv, listing, viewerToken, "")

	for _, ws := range []*websocket.Conn{ownerWS, watcherWS} {
		ev := readStatsEvent(t, ws)
		if ev.Data.ListingID != listing || ev.Data.Views == nil || *ev.Data.Views != 1 {
			t.Fatalf("unexpected stats event: %+v", ev)
		}
	}
}

func TestListingWatchStrangerWithoutWatchGetsNothing(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	otherListing := mustCreateListing(t, owner, "active")

	strangerWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer strangerWS.Close()
	sendWatch(t, strangerWS, otherListing)
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, viewer)
	getListing(t, srv, listing, viewerToken, "")

	expectNoEvent(t, strangerWS)
}

func TestListingWatchUnauthorizedSubscriptionSilentlyIgnored(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	stranger := mustCreateUser(t, "tenant")
	pending := mustCreateListing(t, owner, "pending")

	strangerWS := dialWatcher(t, srv, stranger)
	defer strangerWS.Close()
	sendWatch(t, strangerWS, pending)
	time.Sleep(50 * time.Millisecond)

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	sendWatch(t, ownerWS, pending)
	time.Sleep(50 * time.Millisecond)

	fanToken := mustCreateSession(t, mustCreateUser(t, "tenant"))
	getListing(t, srv, pending, fanToken, "")

	ownerEv := readStatsEvent(t, ownerWS)
	if ownerEv.Data.ListingID != pending {
		t.Fatalf("owner should receive the event for their own pending listing: %+v", ownerEv)
	}
	expectNoEvent(t, strangerWS)
}

func TestListingWatchSingleSubscriptionReplacesPrevious(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listingA := mustCreateListing(t, owner, "active")
	listingB := mustCreateListing(t, owner, "active")

	ws := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer ws.Close()
	sendWatch(t, ws, listingA)
	time.Sleep(50 * time.Millisecond)
	sendWatch(t, ws, listingB)
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, mustCreateUser(t, "tenant"))
	getListing(t, srv, listingA, viewerToken, "")
	getListing(t, srv, listingB, viewerToken, "")

	ev := readStatsEvent(t, ws)
	if ev.Data.ListingID != listingB {
		t.Fatalf("want event for listingB after switching watch, got %+v", ev)
	}
	expectNoEvent(t, ws)
}

func TestListingWatchClearedByEmptyListingID(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ws := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer ws.Close()
	sendWatch(t, ws, listing)
	time.Sleep(50 * time.Millisecond)
	sendWatch(t, ws, "")
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, mustCreateUser(t, "tenant"))
	getListing(t, srv, listing, viewerToken, "")
	expectNoEvent(t, ws)
}

func TestListingWatchMalformedFramesIgnoredConnectionStaysAlive(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ws := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer ws.Close()

	for _, bad := range []string{
		"not json",
		`{"type":"unknown.event","data":{}}`,
		`{"type":"listing.watch","data":"not-an-object"}`,
		`{"type":"listing.watch"}`,
	} {
		if err := ws.WriteMessage(websocket.TextMessage, []byte(bad)); err != nil {
			t.Fatalf("send malformed frame %q: %v", bad, err)
		}
	}
	time.Sleep(50 * time.Millisecond)

	sendWatch(t, ws, listing)
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, mustCreateUser(t, "tenant"))
	getListing(t, srv, listing, viewerToken, "")
	ev := readStatsEvent(t, ws)
	if ev.Data.ListingID != listing {
		t.Fatalf("connection should still work after malformed frames: %+v", ev)
	}
}

func TestListingWatchRemovedFromHubOnClose(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ws := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	sendWatch(t, ws, listing)
	time.Sleep(50 * time.Millisecond)
	ws.Close()

	deadline := time.Now().Add(2 * time.Second)
	for {
		realtimeHubInstance.mu.Lock()
		n := len(realtimeHubInstance.listingWatchers[listing])
		realtimeHubInstance.mu.Unlock()
		if n == 0 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("listing watcher entry was not cleaned up after close")
		}
		time.Sleep(10 * time.Millisecond)
	}
}

func TestListingWatchOwnerWatchingOwnListingGetsSingleEvent(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	sendWatch(t, ownerWS, listing)
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, viewer)
	getListing(t, srv, listing, viewerToken, "")

	readStatsEvent(t, ownerWS)
	expectNoEvent(t, ownerWS)
}

func TestListingWatchOwnerViewingOwnListingDoesNotPublish(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	ownerToken := mustCreateSession(t, owner)
	getListing(t, srv, listing, ownerToken, "")

	expectNoEvent(t, watcherWS)
}

func TestListingWatchInvalidBrowserIDViewDoesNotPublish(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	getListing(t, srv, listing, "", "short")

	expectNoEvent(t, watcherWS)
}

func TestListingWatchRepeatViewDoesNotPublishAgain(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, viewer)
	getListing(t, srv, listing, viewerToken, "")
	readStatsEvent(t, watcherWS)

	getListing(t, srv, listing, viewerToken, "")
	expectNoEvent(t, watcherWS)
}

func TestListingWatchFavoriteAddAndRemoveDeliverEvents(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	fan := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	resp := toggleFavorite(t, srv, listing, fan, true)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("add favorite status = %d", resp.StatusCode)
	}
	resp = toggleFavorite(t, srv, listing, fan, true)
	resp.Body.Close()
	resp = toggleFavorite(t, srv, listing, fan, false)
	resp.Body.Close()
	resp = toggleFavorite(t, srv, listing, fan, false)
	resp.Body.Close()

	ev := readStatsEvent(t, watcherWS)
	if ev.Data.Favorites == nil || *ev.Data.Favorites != 1 {
		t.Fatalf("want favorites=1, got %+v", ev)
	}
	ev = readStatsEvent(t, watcherWS)
	if ev.Data.Favorites == nil || *ev.Data.Favorites != 0 {
		t.Fatalf("want favorites=0, got %+v", ev)
	}
	expectNoEvent(t, watcherWS)
}

func TestListingWatchInactiveListingStopsPublishingToStrangerWatchers(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	fan := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()
	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	if _, err := db.Exec(`UPDATE listings SET status = 'rented' WHERE id = ?`, listing); err != nil {
		t.Fatalf("update status: %v", err)
	}

	resp := toggleFavorite(t, srv, listing, fan, true)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("add favorite status = %d", resp.StatusCode)
	}

	ev := readStatsEvent(t, ownerWS)
	if ev.Data.ListingID != listing || ev.Data.Favorites == nil || *ev.Data.Favorites != 1 {
		t.Fatalf("owner should still receive the event via owner routing: %+v", ev)
	}
	expectNoEvent(t, watcherWS)
}

func TestListingWatchDeletedListingStopsPublishingToWatchers(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	watcherWS := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer watcherWS.Close()
	sendWatch(t, watcherWS, listing)
	time.Sleep(50 * time.Millisecond)

	if _, err := db.Exec(`DELETE FROM listings WHERE id = ?`, listing); err != nil {
		t.Fatalf("delete listing: %v", err)
	}

	publishListingViews(listing, owner, 1)
	expectNoEvent(t, watcherWS)
}

func TestListingWatchIgnoresNonStringListingID(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingWatchTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ws := dialWatcher(t, srv, mustCreateUser(t, "tenant"))
	defer ws.Close()
	frame := `{"type":"listing.watch","data":{"listingId":123}}`
	if err := ws.WriteMessage(websocket.TextMessage, []byte(frame)); err != nil {
		t.Fatalf("send frame: %v", err)
	}
	time.Sleep(50 * time.Millisecond)

	viewerToken := mustCreateSession(t, mustCreateUser(t, "tenant"))
	getListing(t, srv, listing, viewerToken, "")
	expectNoEvent(t, ws)
}
