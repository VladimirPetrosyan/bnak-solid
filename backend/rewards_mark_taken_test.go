package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestMarkListingTakenGrantsRewardOnce(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	outcome, err := markListingTaken(owner, listing, "bnak", time.Now())
	if err != nil {
		t.Fatalf("markListingTaken: %v", err)
	}
	if outcome.Source != "bnak" || outcome.SecondsToClose < 0 {
		t.Fatalf("unexpected outcome: %+v", outcome)
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "rented" {
		t.Fatalf("status = %q, want rented", status)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardMarkTaken {
		t.Fatalf("balance = %d, want %d", balance, rewardMarkTaken)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE kind = ? AND listing_id = ?`, kindMarkTaken, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 transaction, got %d", count)
	}
	var source string
	var secondsToClose int
	if err := db.QueryRow(`SELECT owner_id, source, seconds_to_close FROM listing_outcomes WHERE listing_id = ?`, listing).
		Scan(new(string), &source, &secondsToClose); err != nil {
		t.Fatalf("outcome row missing: %v", err)
	}
	if source != "bnak" || secondsToClose < 0 {
		t.Fatalf("stored outcome mismatch: source=%s seconds=%d", source, secondsToClose)
	}
}

func TestMarkListingTakenSecondsToClose(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	createdAt := time.Now().Add(-90 * time.Minute)
	if _, err := db.Exec(`UPDATE listings SET created_at = ? WHERE id = ?`, createdAt, listing); err != nil {
		t.Fatalf("backdate created_at: %v", err)
	}

	outcome, err := markListingTaken(owner, listing, "referral", time.Now())
	if err != nil {
		t.Fatalf("markListingTaken: %v", err)
	}
	if outcome.SecondsToClose < 89*60 || outcome.SecondsToClose > 91*60 {
		t.Fatalf("secondsToClose = %d, want ~5400", outcome.SecondsToClose)
	}
}

func TestMarkListingTakenFutureCreatedAtClampsToZero(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	future := time.Now().Add(24 * time.Hour)
	if _, err := db.Exec(`UPDATE listings SET created_at = ? WHERE id = ?`, future, listing); err != nil {
		t.Fatalf("set future created_at: %v", err)
	}

	outcome, err := markListingTaken(owner, listing, "offline", time.Now())
	if err != nil {
		t.Fatalf("markListingTaken: %v", err)
	}
	if outcome.SecondsToClose != 0 {
		t.Fatalf("secondsToClose = %d, want 0 for future createdAt", outcome.SecondsToClose)
	}
}

func TestMarkListingTakenRepeatIsConflict(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	if _, err := markListingTaken(owner, listing, "bnak", time.Now()); err != nil {
		t.Fatalf("first mark-taken: %v", err)
	}
	if _, err := markListingTaken(owner, listing, "bnak", time.Now()); err != errListingNotActive {
		t.Fatalf("want errListingNotActive, got %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardMarkTaken {
		t.Fatalf("balance after repeat = %d, want %d (no duplicate)", balance, rewardMarkTaken)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 outcome row, got %d", count)
	}
}

func TestMarkListingTakenInvalidStatuses(t *testing.T) {
	for _, status := range []string{"pending", "flagged", "archived", "rented"} {
		setupTestDB(t)
		owner := mustCreateUser(t, "owner")
		listing := mustCreateListing(t, owner, status)

		if _, err := markListingTaken(owner, listing, "bnak", time.Now()); err != errListingNotActive {
			t.Fatalf("status %s: want errListingNotActive, got %v", status, err)
		}
		balance, _ := tokenBalance(db, owner)
		if balance != 0 {
			t.Fatalf("status %s: balance = %d, want 0", status, balance)
		}
		var got string
		db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&got)
		if got != status {
			t.Fatalf("status changed from %s to %s", status, got)
		}
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
		if count != 0 {
			t.Fatalf("status %s: outcome row written despite rejection", status)
		}
	}
}

func TestMarkListingTakenForbiddenForStranger(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	stranger := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	if _, err := markListingTaken(stranger, listing, "bnak", time.Now()); err != errNotOwner {
		t.Fatalf("want errNotOwner, got %v", err)
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "active" {
		t.Fatalf("status changed to %s despite forbidden request", status)
	}
}

func TestMarkListingTakenNotFound(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	if _, err := markListingTaken(owner, newID(), "bnak", time.Now()); err != errListingNotFound {
		t.Fatalf("want errListingNotFound, got %v", err)
	}
}

func TestMarkListingTakenRollbackOnOutcomeFailure(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	if _, err := db.Exec(`CREATE TRIGGER force_fail_outcome BEFORE INSERT ON listing_outcomes
		BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := markListingTaken(owner, listing, "bnak", time.Now()); err == nil {
		t.Fatalf("want error from forced outcome failure")
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "active" {
		t.Fatalf("want status still active after rollback, got %s", status)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("outcome row persisted despite rollback")
	}
}

func TestMarkListingTakenRollbackOnLedgerFailure(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	if _, err := db.Exec(`CREATE TRIGGER force_fail_mark_taken BEFORE INSERT ON token_transactions
		WHEN NEW.kind = 'mark_taken' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := markListingTaken(owner, listing, "bnak", time.Now()); err == nil {
		t.Fatalf("want error from forced ledger failure")
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "active" {
		t.Fatalf("want status still active after rollback, got %s", status)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("outcome row persisted despite rollback")
	}
}

func TestMarkListingTakenConcurrentDoubleRequest(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	var wg sync.WaitGroup
	errs := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, err := markListingTaken(owner, listing, "bnak", time.Now())
			errs[i] = err
		}(i)
	}
	wg.Wait()

	successes, conflicts := 0, 0
	for _, err := range errs {
		switch err {
		case nil:
			successes++
		case errListingNotActive:
			conflicts++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("want exactly one success and one conflict, got %v", errs)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardMarkTaken {
		t.Fatalf("balance = %d, want %d (single grant)", balance, rewardMarkTaken)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 outcome row, got %d", count)
	}
}

func markTakenRequest(t *testing.T, ownerID, listingID, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/listings/"+listingID+"/mark-taken", strings.NewReader(body))
	req.SetPathValue("id", listingID)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: ownerID}))
	rec := httptest.NewRecorder()
	handleMarkTaken(rec, req)
	return rec
}

func TestHandleMarkTakenMissingSourceRejected(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	rec := markTakenRequest(t, owner, listing, `{}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "invalid_source" {
		t.Fatalf("want invalid_source, got %q", body.Error)
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "active" {
		t.Fatalf("status changed to %s on rejected request", status)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance changed to %d on rejected request", balance)
	}
}

func TestHandleMarkTakenInvalidSourceRejected(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	rec := markTakenRequest(t, owner, listing, `{"source":"telegram"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "active" {
		t.Fatalf("status changed to %s on rejected request", status)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("outcome written despite invalid source")
	}
}

func TestHandleMarkTakenBadJSONRejected(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	rec := markTakenRequest(t, owner, listing, `not json`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "bad json" {
		t.Fatalf("want bad json, got %q", body.Error)
	}
}

func TestHandleMarkTakenSuccessReturnsOutcome(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	rec := markTakenRequest(t, owner, listing, `{"source":"other_platform"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		OK      bool `json:"ok"`
		Outcome struct {
			Source         string `json:"source"`
			SecondsToClose int    `json:"secondsToClose"`
		} `json:"outcome"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !body.OK || body.Outcome.Source != "other_platform" || body.Outcome.SecondsToClose < 0 {
		t.Fatalf("unexpected response: %+v", body)
	}
}

func TestMarkTakenOutcomeOwnerMineOnlyNotPublic(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	stranger := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")

	if rec := markTakenRequest(t, owner, listing, `{"source":"referral"}`); rec.Code != http.StatusOK {
		t.Fatalf("mark-taken failed: %s", rec.Body.String())
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	getReq.SetPathValue("id", listing)
	getReq = getReq.WithContext(context.WithValue(getReq.Context(), ctxUserKey, &User{ID: stranger}))
	getRec := httptest.NewRecorder()
	handleGetListing(getRec, getReq)
	if strings.Contains(getRec.Body.String(), "referral") || strings.Contains(getRec.Body.String(), "outcome") {
		t.Fatalf("public listing response leaks outcome: %s", getRec.Body.String())
	}

	mineReq := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	mineReq = mineReq.WithContext(context.WithValue(mineReq.Context(), ctxUserKey, &User{ID: owner}))
	mineRec := httptest.NewRecorder()
	handleMyListings(mineRec, mineReq)
	var mine []struct {
		Listing struct {
			ID string `json:"id"`
		} `json:"listing"`
		Outcome *struct {
			Source         string `json:"source"`
			SecondsToClose int    `json:"secondsToClose"`
		} `json:"outcome"`
	}
	if err := json.Unmarshal(mineRec.Body.Bytes(), &mine); err != nil {
		t.Fatalf("decode mine: %v", err)
	}
	found := false
	for _, entry := range mine {
		if entry.Listing.ID != listing {
			continue
		}
		found = true
		if entry.Outcome == nil || entry.Outcome.Source != "referral" {
			t.Fatalf("owner mine missing outcome for rented listing: %+v", entry)
		}
	}
	if !found {
		t.Fatalf("listing %s missing from mine", listing)
	}
}

func TestMarkTakenOutcomeCascadeDeletesWithListing(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	if _, err := markListingTaken(owner, listing, "bnak", time.Now()); err != nil {
		t.Fatalf("markListingTaken: %v", err)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want outcome row before delete, got %d", count)
	}

	if _, err := db.Exec(`DELETE FROM listings WHERE id = ?`, listing); err != nil {
		t.Fatalf("delete listing: %v", err)
	}
	db.QueryRow(`SELECT COUNT(*) FROM listing_outcomes WHERE listing_id = ?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("outcome row survived listing delete, want cascade")
	}
}
