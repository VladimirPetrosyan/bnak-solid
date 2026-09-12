package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

func TestRecordListingViewDedupesPerViewer(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewerA := mustCreateUser(t, "tenant")
	viewerB := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	must(t, recordListingView(listing, owner, viewerA, ""))
	must(t, recordListingView(listing, owner, viewerA, ""))
	if n := mustViewCount(t, listing); n != 1 {
		t.Fatalf("views after repeat visits from the same viewer = %d, want 1", n)
	}

	must(t, recordListingView(listing, owner, viewerB, ""))
	if n := mustViewCount(t, listing); n != 2 {
		t.Fatalf("views after a second viewer = %d, want 2", n)
	}
}

func TestRecordListingViewSkipsOwner(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	must(t, recordListingView(listing, owner, owner, ""))
	if n := mustViewCount(t, listing); n != 0 {
		t.Fatalf("views from the owner = %d, want 0", n)
	}
}

func TestRecordListingViewAuthIdentityOverridesBrowserID(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	must(t, recordListingView(listing, owner, viewer, "browser-one-aaaaaa"))
	must(t, recordListingView(listing, owner, viewer, "browser-two-bbbbbb"))
	if n := mustViewCount(t, listing); n != 1 {
		t.Fatalf("views = %d, want 1 (same authenticated viewer regardless of browser id)", n)
	}
}

func TestRecordListingViewAnonymousBrowserID(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	must(t, recordListingView(listing, owner, "", "anon-browser-aaaaaa"))
	must(t, recordListingView(listing, owner, "", "anon-browser-aaaaaa"))
	if n := mustViewCount(t, listing); n != 1 {
		t.Fatalf("views from repeated anonymous visits = %d, want 1", n)
	}

	must(t, recordListingView(listing, owner, "", "anon-browser-bbbbbb"))
	if n := mustViewCount(t, listing); n != 2 {
		t.Fatalf("views after a second anonymous browser id = %d, want 2", n)
	}
}

func TestRecordListingViewMissingOrInvalidBrowserIDIsNoop(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	for _, browserID := range []string{"", "short", string(make([]byte, maxBrowserIDLen+1)), "bad id with spaces"} {
		if err := recordListingView(listing, owner, "", browserID); err != nil {
			t.Fatalf("recordListingView(%q): %v", browserID, err)
		}
	}
	if n := mustViewCount(t, listing); n != 0 {
		t.Fatalf("views from missing/invalid browser ids = %d, want 0", n)
	}
}

func TestRecordListingViewConcurrentSameViewerNoDuplicate(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	var wg sync.WaitGroup
	errs := make([]error, 8)
	for i := range errs {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			errs[i] = recordListingView(listing, owner, viewer, "")
		}(i)
	}
	wg.Wait()

	for i, err := range errs {
		if err != nil {
			t.Fatalf("concurrent recordListingView[%d]: %v", i, err)
		}
	}
	if n := mustViewCount(t, listing); n != 1 {
		t.Fatalf("views after concurrent identical requests = %d, want 1", n)
	}
}

func TestListingViewsCascadeDeleteWithListing(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	must(t, recordListingView(listing, owner, "", "cascade-browser-aaaa"))
	if n := mustViewCount(t, listing); n != 1 {
		t.Fatalf("views before delete = %d, want 1", n)
	}

	if err := deleteListingAndDocument(listing); err != nil {
		t.Fatalf("deleteListingAndDocument: %v", err)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM listing_views WHERE listing_id = ?`, listing).Scan(&count); err != nil {
		t.Fatalf("count listing_views: %v", err)
	}
	if count != 0 {
		t.Fatalf("listing_views rows after cascade delete = %d, want 0", count)
	}
}

func TestFavoriteCountMatchesFavoritesTable(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	fan := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	rec := doFavoriteRequest(t, http.MethodPost, fan, listing)
	assertFavoritesResponse(t, rec, 1)

	rec = doFavoriteRequest(t, http.MethodDelete, fan, listing)
	assertFavoritesResponse(t, rec, 0)
}

func TestHandleGetListingReturnsViewsAndFavoritesStats(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`INSERT INTO favorites(user_id, listing_id) VALUES (?, ?)`, viewer, listing); err != nil {
		t.Fatalf("seed favorite: %v", err)
	}

	body := getListingBody(t, listing, viewer, "")
	if v, ok := body["views"].(float64); !ok || v != 1 {
		t.Fatalf("views = %v, want 1", body["views"])
	}
	if f, ok := body["favorites"].(float64); !ok || f != 1 {
		t.Fatalf("favorites = %v, want 1", body["favorites"])
	}

	body = getListingBody(t, listing, viewer, "")
	if v := body["views"]; v != float64(1) {
		t.Fatalf("views after refresh = %v, want 1 (no double count)", v)
	}
}

func TestHandleGetListingReturns500WhenViewWriteFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE listing_views`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	req.SetPathValue("id", listing)
	req = withCtxUser(t, req, viewer)
	rec := httptest.NewRecorder()
	handleGetListing(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := decodeJSONBody(t, rec)
	if _, ok := body["views"]; ok {
		t.Fatalf("response leaked partial stats: %v", body)
	}
	if _, ok := body["favorites"]; ok {
		t.Fatalf("response leaked partial stats: %v", body)
	}
}

func TestHandleGetListingReturns500WhenViewCountReadFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE listing_views`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	req.SetPathValue("id", listing)
	req = withCtxUser(t, req, owner) // owner: recordListingView no-ops, isolating the read failure
	rec := httptest.NewRecorder()
	handleGetListing(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := decodeJSONBody(t, rec)
	if _, ok := body["views"]; ok {
		t.Fatalf("response leaked partial stats: %v", body)
	}
	if _, ok := body["favorites"]; ok {
		t.Fatalf("response leaked partial stats: %v", body)
	}
}

func TestHandleGetListingReturns500WhenFavoriteCountReadFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE favorites`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	req.SetPathValue("id", listing)
	req = withCtxUser(t, req, viewer)
	rec := httptest.NewRecorder()
	handleGetListing(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := decodeJSONBody(t, rec)
	if _, ok := body["views"]; ok {
		t.Fatalf("response leaked partial stats: %v", body)
	}
	if _, ok := body["favorites"]; ok {
		t.Fatalf("response leaked partial stats: %v", body)
	}
}

func TestHandleMyListingsReturnsViewsAndFavoritesPerListing(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	viewer := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	must(t, recordListingView(listing, owner, viewer, ""))
	if _, err := db.Exec(`INSERT INTO favorites(user_id, listing_id) VALUES (?, ?)`, viewer, listing); err != nil {
		t.Fatalf("seed favorite: %v", err)
	}

	list := mineBody(t, owner)
	if len(list) != 1 {
		t.Fatalf("mine list length = %d, want 1", len(list))
	}
	if v := list[0]["views"]; v != float64(1) {
		t.Fatalf("views = %v, want 1", v)
	}
	if f := list[0]["favorites"]; f != float64(1) {
		t.Fatalf("favorites = %v, want 1", f)
	}
}

func TestHandleMyListingsEmptyIsEmptyArray(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")

	req := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMyListings(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if body := rec.Body.String(); body != "[]\n" && body != "[]" {
		t.Fatalf("body = %q, want an empty array", body)
	}
}

func TestHandleMyListingsReturns500WhenViewCountReadFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE listing_views`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	req = withCtxUser(t, req, owner)
	rec := httptest.NewRecorder()
	handleMyListings(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestHandleListFavoritesReturnsViewsAndFavoritesPerListing(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	fan := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	must(t, recordListingView(listing, owner, "", "fav-list-browser-aaaa"))
	if _, err := db.Exec(`INSERT INTO favorites(user_id, listing_id) VALUES (?, ?)`, fan, listing); err != nil {
		t.Fatalf("seed favorite: %v", err)
	}

	list := favoritesBody(t, fan)
	if len(list) != 1 {
		t.Fatalf("favorites list length = %d, want 1", len(list))
	}
	if v := list[0]["views"]; v != float64(1) {
		t.Fatalf("views = %v, want 1", v)
	}
	if f := list[0]["favorites"]; f != float64(1) {
		t.Fatalf("favorites = %v, want 1", f)
	}
}

func TestHandleListFavoritesEmptyIsEmptyArray(t *testing.T) {
	setupTestDB(t)
	fan := mustCreateUser(t, "tenant")

	req := httptest.NewRequest(http.MethodGet, "/api/favorites", nil)
	req = withCtxUser(t, req, fan)
	rec := httptest.NewRecorder()
	handleListFavorites(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if body := rec.Body.String(); body != "[]\n" && body != "[]" {
		t.Fatalf("body = %q, want an empty array", body)
	}
}

func TestHandleListFavoritesReturns500WhenFavoriteCountReadFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	fan := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`INSERT INTO favorites(user_id, listing_id) VALUES (?, ?)`, fan, listing); err != nil {
		t.Fatalf("seed favorite: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE listing_views`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/favorites", nil)
	req = withCtxUser(t, req, fan)
	rec := httptest.NewRecorder()
	handleListFavorites(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestFavoritesCascadeDeleteWithListing(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	fan := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`INSERT INTO favorites(user_id, listing_id) VALUES (?, ?)`, fan, listing); err != nil {
		t.Fatalf("seed favorite: %v", err)
	}

	if err := deleteListingAndDocument(listing); err != nil {
		t.Fatalf("deleteListingAndDocument: %v", err)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM favorites WHERE listing_id = ?`, listing).Scan(&count); err != nil {
		t.Fatalf("count favorites: %v", err)
	}
	if count != 0 {
		t.Fatalf("favorites rows after cascade delete = %d, want 0", count)
	}
}

func mineBody(t *testing.T, ownerID string) []map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	req = withCtxUser(t, req, ownerID)
	rec := httptest.NewRecorder()
	handleMyListings(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	return decodeJSONArrayBody(t, rec)
}

func favoritesBody(t *testing.T, userID string) []map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/favorites", nil)
	req = withCtxUser(t, req, userID)
	rec := httptest.NewRecorder()
	handleListFavorites(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	return decodeJSONArrayBody(t, rec)
}

func decodeJSONArrayBody(t *testing.T, rec *httptest.ResponseRecorder) []map[string]any {
	t.Helper()
	var body []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode json array: %v, body = %s", err, rec.Body.String())
	}
	return body
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func mustViewCount(t *testing.T, listingID string) int {
	t.Helper()
	n, err := viewCount(listingID)
	if err != nil {
		t.Fatalf("viewCount: %v", err)
	}
	return n
}

func doFavoriteRequest(t *testing.T, method, userID, listingID string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, "/api/favorites/"+listingID, nil)
	req.SetPathValue("id", listingID)
	req = withCtxUser(t, req, userID)
	rec := httptest.NewRecorder()
	if method == http.MethodPost {
		handleAddFavorite(rec, req)
	} else {
		handleRemoveFavorite(rec, req)
	}
	return rec
}

func getListingBody(t *testing.T, listingID, requesterID, browserID string) map[string]any {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/listings/"+listingID, nil)
	req.SetPathValue("id", listingID)
	if browserID != "" {
		req.Header.Set(browserIDHeader, browserID)
	}
	if requesterID != "" {
		req = withCtxUser(t, req, requesterID)
	}
	rec := httptest.NewRecorder()
	handleGetListing(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	return decodeJSONBody(t, rec)
}

func assertFavoritesResponse(t *testing.T, rec *httptest.ResponseRecorder, want int) {
	t.Helper()
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	body := decodeJSONBody(t, rec)
	if f, ok := body["favorites"].(float64); !ok || int(f) != want {
		t.Fatalf("favorites = %v, want %d", body["favorites"], want)
	}
}

func withCtxUser(t *testing.T, r *http.Request, userID string) *http.Request {
	t.Helper()
	return r.WithContext(context.WithValue(r.Context(), ctxUserKey, &User{ID: userID}))
}

func decodeJSONBody(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode json: %v, body = %s", err, rec.Body.String())
	}
	return body
}
