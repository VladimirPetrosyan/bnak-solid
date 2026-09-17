package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestComplaintCountsExcludesDismissedReports(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporterA := mustCreateUser(t, "tenant")
	reporterB := mustCreateUser(t, "tenant")
	reporterC := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	other := mustCreateListing(t, owner, "active")

	if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text, status) VALUES (?, ?, 'other', '', 'pending')`, listing, reporterA); err != nil {
		t.Fatalf("insert: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text, status) VALUES (?, ?, 'other', '', 'upheld')`, listing, reporterB); err != nil {
		t.Fatalf("insert: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text, status) VALUES (?, ?, 'other', '', 'dismissed')`, listing, reporterC); err != nil {
		t.Fatalf("insert: %v", err)
	}

	counts, err := complaintCounts([]string{listing, other}, time.Now().Add(-90*24*time.Hour))
	if err != nil {
		t.Fatalf("complaintCounts: %v", err)
	}
	if counts[listing] != 2 {
		t.Fatalf("counts[listing] = %d, want 2 (dismissed excluded)", counts[listing])
	}
	if counts[other] != 0 {
		t.Fatalf("counts[other] = %d, want 0", counts[other])
	}
}

func TestComplaintCountsEmptyInput(t *testing.T) {
	setupTestDB(t)
	counts, err := complaintCounts(nil, time.Now().Add(-90*24*time.Hour))
	if err != nil {
		t.Fatalf("complaintCounts: %v", err)
	}
	if len(counts) != 0 {
		t.Fatalf("want empty map, got %v", counts)
	}
}

func TestComplaintCountsExcludesReportsOutsideTheWindow(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	old := time.Now().Add(-100 * 24 * time.Hour)
	if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text, status, created_at) VALUES (?, ?, 'other', '', 'pending', ?)`, listing, reporter, old); err != nil {
		t.Fatalf("insert: %v", err)
	}

	counts, err := complaintCounts([]string{listing}, time.Now().Add(-90*24*time.Hour))
	if err != nil {
		t.Fatalf("complaintCounts: %v", err)
	}
	if counts[listing] != 0 {
		t.Fatalf("counts[listing] = %d, want 0 (report is outside the 90-day window)", counts[listing])
	}
}

func TestMyListingsReportsRealComplaintCount(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text, status) VALUES (?, ?, 'other', '', 'pending')`, listing, reporter); err != nil {
		t.Fatalf("insert: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/my/listings", nil)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner, Role: "owner"}))
	rec := httptest.NewRecorder()
	handleMyListings(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out) != 1 {
		t.Fatalf("want 1 listing, got %d", len(out))
	}
	got, ok := out[0]["complaints"].(float64)
	if !ok || got != 1 {
		t.Fatalf("complaints = %v, want 1", out[0]["complaints"])
	}
}
