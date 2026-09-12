package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"
)

func postAdminResolve(reportID, action string) *httptest.ResponseRecorder {
	body, _ := json.Marshal(adminResolveInput{Action: action})
	req := httptest.NewRequest(http.MethodPost, "/api/admin/reports/"+reportID+"/resolve", bytes.NewReader(body))
	req.SetPathValue("id", reportID)
	rec := httptest.NewRecorder()
	handleAdminResolveReport(rec, req)
	return rec
}

func mustCreateReport(t *testing.T, listingID, reporterID, status string) string {
	t.Helper()
	res, err := db.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text, status) VALUES (?, ?, 'taken', '', ?)`,
		listingID, reporterID, status)
	if err != nil {
		t.Fatalf("create report: %v", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		t.Fatalf("report id: %v", err)
	}
	return strconv.FormatInt(id, 10)
}

func TestResolveReportUpholdGrantsRewardAndArchives(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	if err := resolveReport(report, "uphold", time.Now()); err != nil {
		t.Fatalf("resolveReport: %v", err)
	}
	var reportStatus string
	db.QueryRow(`SELECT status FROM reports WHERE id = ?`, report).Scan(&reportStatus)
	if reportStatus != "upheld" {
		t.Fatalf("report status = %q, want upheld", reportStatus)
	}
	var listingStatus string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&listingStatus)
	if listingStatus != "archived" {
		t.Fatalf("listing status = %q, want archived", listingStatus)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != rewardUsefulReport {
		t.Fatalf("balance = %d, want %d", balance, rewardUsefulReport)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE kind = ?`, kindUsefulReport).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 transaction, got %d", count)
	}
}

func TestResolveReportDismissNoReward(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	if err := resolveReport(report, "dismiss", time.Now()); err != nil {
		t.Fatalf("resolveReport: %v", err)
	}
	var reportStatus string
	db.QueryRow(`SELECT status FROM reports WHERE id = ?`, report).Scan(&reportStatus)
	if reportStatus != "dismissed" {
		t.Fatalf("report status = %q, want dismissed", reportStatus)
	}
	var listingStatus string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&listingStatus)
	if listingStatus != "active" {
		t.Fatalf("listing status = %q, want active", listingStatus)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
}

func TestResolveReportRepeatIsConflict(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	if err := resolveReport(report, "uphold", time.Now()); err != nil {
		t.Fatalf("first resolve: %v", err)
	}
	if err := resolveReport(report, "uphold", time.Now()); err != errReportAlreadyResolved {
		t.Fatalf("want errReportAlreadyResolved on repeat uphold, got %v", err)
	}
	if err := resolveReport(report, "dismiss", time.Now()); err != errReportAlreadyResolved {
		t.Fatalf("want errReportAlreadyResolved on dismiss after uphold, got %v", err)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != rewardUsefulReport {
		t.Fatalf("balance after repeat = %d, want %d (no duplicate)", balance, rewardUsefulReport)
	}
}

func TestResolveReportNotFound(t *testing.T) {
	setupTestDB(t)
	if err := resolveReport("999999", "uphold", time.Now()); err != errReportNotFound {
		t.Fatalf("want errReportNotFound, got %v", err)
	}
}

func TestHandleAdminResolveReportInvalidAction(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	rec := postAdminResolve(report, "escalate")
	if rec.Code != 400 {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var reportStatus string
	db.QueryRow(`SELECT status FROM reports WHERE id = ?`, report).Scan(&reportStatus)
	if reportStatus != "pending" {
		t.Fatalf("report status changed to %q on invalid action", reportStatus)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
}

func TestResolveReportMonthlyCapBoundary(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	now := time.Now().UTC()

	for i := 0; i < 3; i++ {
		listing := mustCreateListing(t, owner, "flagged")
		report := mustCreateReport(t, listing, reporter, "pending")
		if err := resolveReport(report, "uphold", now); err != nil {
			t.Fatalf("resolve %d: %v", i, err)
		}
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != monthlyReportCap {
		t.Fatalf("balance = %d, want %d after 3 upheld reports", balance, monthlyReportCap)
	}

	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")
	if err := resolveReport(report, "uphold", now); err != nil {
		t.Fatalf("fourth resolve: %v", err)
	}
	var listingStatus, reportStatus string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&listingStatus)
	db.QueryRow(`SELECT status FROM reports WHERE id = ?`, report).Scan(&reportStatus)
	if listingStatus != "archived" || reportStatus != "upheld" {
		t.Fatalf("fourth report/listing not processed: report=%s listing=%s", reportStatus, listingStatus)
	}
	balance, _ = tokenBalance(db, reporter)
	if balance != monthlyReportCap {
		t.Fatalf("balance after cap = %d, want %d (no partial)", balance, monthlyReportCap)
	}

	nextMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, 0)
	listing2 := mustCreateListing(t, owner, "flagged")
	report2 := mustCreateReport(t, listing2, reporter, "pending")
	if err := resolveReport(report2, "uphold", nextMonth); err != nil {
		t.Fatalf("next month resolve: %v", err)
	}
	balance, _ = tokenBalance(db, reporter)
	if balance != monthlyReportCap+rewardUsefulReport {
		t.Fatalf("balance next month = %d, want %d", balance, monthlyReportCap+rewardUsefulReport)
	}
}

func TestResolveReportRollbackOnLedgerFailure(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	if _, err := db.Exec(`CREATE TRIGGER force_fail_useful_report BEFORE INSERT ON token_transactions
		WHEN NEW.kind = 'useful_report' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if err := resolveReport(report, "uphold", time.Now()); err == nil {
		t.Fatalf("want error from forced ledger failure")
	}
	var reportStatus, listingStatus string
	db.QueryRow(`SELECT status FROM reports WHERE id = ?`, report).Scan(&reportStatus)
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&listingStatus)
	if reportStatus != "pending" || listingStatus != "flagged" {
		t.Fatalf("want rollback of both statuses, got report=%s listing=%s", reportStatus, listingStatus)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
}

func TestResolveReportUpholdRollsBackIfListingArchiveFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	if _, err := db.Exec(`CREATE TRIGGER force_fail_archive BEFORE UPDATE OF status ON listings
		WHEN NEW.status = 'archived' AND OLD.id = '` + listing + `' BEGIN SELECT RAISE(ABORT, 'listing disappeared'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if err := resolveReport(report, "uphold", time.Now()); err == nil {
		t.Fatalf("want error when listing archive fails")
	}
	var reportStatus, listingStatus string
	db.QueryRow(`SELECT status FROM reports WHERE id = ?`, report).Scan(&reportStatus)
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&listingStatus)
	if reportStatus != "pending" || listingStatus != "flagged" {
		t.Fatalf("want rollback of both statuses, got report=%s listing=%s", reportStatus, listingStatus)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE kind = ?`, kindUsefulReport).Scan(&count)
	if count != 0 {
		t.Fatalf("want no useful_report transaction, got %d", count)
	}
}

func TestResolveReportConcurrentDoubleUphold(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	reporter := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "flagged")
	report := mustCreateReport(t, listing, reporter, "pending")

	var wg sync.WaitGroup
	errs := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			errs[i] = resolveReport(report, "uphold", time.Now())
		}(i)
	}
	wg.Wait()

	successes, conflicts := 0, 0
	for _, err := range errs {
		switch err {
		case nil:
			successes++
		case errReportAlreadyResolved:
			conflicts++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("want exactly one success and one conflict, got %v", errs)
	}
	balance, _ := tokenBalance(db, reporter)
	if balance != rewardUsefulReport {
		t.Fatalf("balance = %d, want %d (single grant)", balance, rewardUsefulReport)
	}
}
