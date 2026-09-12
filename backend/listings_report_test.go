package main

import (
	"net/http"
	"testing"
	"time"
)

func TestCreateListingReportRollsBackOnFlagFailure(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	if _, err := db.Exec(`CREATE TRIGGER force_fail_flag BEFORE UPDATE OF status ON listings
		WHEN NEW.status = 'flagged' AND OLD.id = '` + listing + `' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := createListingReport(listing, reporter, reportInput{Reason: "other"}, time.Now()); err == nil {
		t.Fatalf("want error from forced listing update failure")
	}

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM reports WHERE listing_id = ?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("want report insert rolled back, got %d rows", count)
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "active" {
		t.Fatalf("status changed despite forced failure: %s", status)
	}
}

func TestReportListingRepeatedOnFlaggedIsNotPublished(t *testing.T) {
	setupTestDB(t)
	setCORS(t, true, "http://localhost:5173")
	srv := listingStateTestServer(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "flagged")

	var before time.Time
	db.QueryRow(`SELECT updated_at FROM listings WHERE id = ?`, listing).Scan(&before)

	ownerWS := dialWatcher(t, srv, owner)
	defer ownerWS.Close()

	reporterToken := mustCreateSession(t, mustCreateUser(t, "tenant"))
	resp := postAction(t, srv, "/api/listings/"+listing+"/report", reporterToken, `{"reason":"other","text":""}`)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("report status = %d", resp.StatusCode)
	}
	expectNoEvent(t, ownerWS)

	var after time.Time
	var status string
	db.QueryRow(`SELECT status, updated_at FROM listings WHERE id = ?`, listing).Scan(&status, &after)
	if status != "flagged" {
		t.Fatalf("status changed: %s", status)
	}
	if !after.Equal(before) {
		t.Fatalf("updated_at changed despite repeated report: before=%v after=%v", before, after)
	}
}

func TestResolveReportOnNonFlaggedListingIsNoOp(t *testing.T) {
	for _, status := range []string{"active", "archived"} {
		t.Run(status, func(t *testing.T) {
			setupTestDB(t)
			setCORS(t, true, "http://localhost:5173")
			srv := listingStateTestServer(t)
			owner := mustCreateUser(t, "owner")
			reporter := mustCreateUser(t, "tenant")
			listing := mustCreateListing(t, owner, status)
			if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text) VALUES (?, ?, 'other', '')`, listing, reporter); err != nil {
				t.Fatalf("seed report: %v", err)
			}

			var before time.Time
			db.QueryRow(`SELECT updated_at FROM listings WHERE id = ?`, listing).Scan(&before)

			ownerWS := dialWatcher(t, srv, owner)
			defer ownerWS.Close()

			ownerToken := mustCreateSession(t, owner)
			resp := postAction(t, srv, "/api/listings/"+listing+"/resolve", ownerToken, "")
			resp.Body.Close()
			if resp.StatusCode != http.StatusOK {
				t.Fatalf("resolve status = %d", resp.StatusCode)
			}
			expectNoEvent(t, ownerWS)

			var reportStatus, listingStatus string
			var after time.Time
			db.QueryRow(`SELECT status FROM reports WHERE listing_id = ?`, listing).Scan(&reportStatus)
			db.QueryRow(`SELECT status, updated_at FROM listings WHERE id = ?`, listing).Scan(&listingStatus, &after)
			if reportStatus != "pending" {
				t.Fatalf("report status changed: %s", reportStatus)
			}
			if listingStatus != status {
				t.Fatalf("listing status changed: %s", listingStatus)
			}
			if !after.Equal(before) {
				t.Fatalf("updated_at changed despite no-op resolve: before=%v after=%v", before, after)
			}
		})
	}
}

func TestDismissListingReportsRollsBackOnReactivateFailure(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	if _, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text) VALUES (?, ?, 'other', '')`, listing, reporter); err != nil {
		t.Fatalf("seed report: %v", err)
	}

	if _, err := db.Exec(`CREATE TRIGGER force_fail_reactivate BEFORE UPDATE OF status ON listings
		WHEN NEW.status = 'active' AND OLD.id = '` + listing + `' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := dismissListingReports(listing, time.Now()); err == nil {
		t.Fatalf("want error from forced listing update failure")
	}

	var reportStatus, listingStatus string
	db.QueryRow(`SELECT status FROM reports WHERE listing_id = ?`, listing).Scan(&reportStatus)
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&listingStatus)
	if reportStatus != "pending" || listingStatus != "flagged" {
		t.Fatalf("want rollback of both statuses, got report=%s listing=%s", reportStatus, listingStatus)
	}
}
