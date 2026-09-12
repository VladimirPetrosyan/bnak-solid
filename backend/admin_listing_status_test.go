package main

import (
	"testing"
	"time"
)

func TestSetListingStatusSameStatusIsTrueNoOp(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "flagged")

	var before time.Time
	db.QueryRow(`SELECT updated_at FROM listings WHERE id = ?`, listing).Scan(&before)

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	if err := setListingStatus(listing, "flagged", time.Now()); err != nil {
		t.Fatalf("setListingStatus: %v", err)
	}
	expectNoEvent(t, ownerWS)

	var after time.Time
	var status string
	db.QueryRow(`SELECT status, updated_at FROM listings WHERE id = ?`, listing).Scan(&status, &after)
	if status != "flagged" {
		t.Fatalf("status changed: %s", status)
	}
	if !after.Equal(before) {
		t.Fatalf("updated_at changed on same-status no-op: before=%v after=%v", before, after)
	}
}

func TestSetListingStatusActiveToActiveIsExplicitRenew(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	before := time.Now()
	if err := setListingStatus(listing, "active", time.Now()); err != nil {
		t.Fatalf("setListingStatus: %v", err)
	}

	ev := readListingState(t, ownerWS)
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

func TestResolveReportUpholdAlreadyArchivedNoOp(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "archived")
	report := mustCreateReport(t, listing, reporter, "pending")

	var before time.Time
	db.QueryRow(`SELECT updated_at FROM listings WHERE id = ?`, listing).Scan(&before)

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	if err := resolveReport(report, "uphold", time.Now()); err != nil {
		t.Fatalf("resolveReport: %v", err)
	}
	expectNoEvent(t, ownerWS)

	var after time.Time
	var status string
	db.QueryRow(`SELECT status, updated_at FROM listings WHERE id = ?`, listing).Scan(&status, &after)
	if status != "archived" {
		t.Fatalf("status = %s, want archived", status)
	}
	if !after.Equal(before) {
		t.Fatalf("updated_at changed for an already-archived uphold: before=%v after=%v", before, after)
	}
}
