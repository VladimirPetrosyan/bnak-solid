package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func setupTestDB(t *testing.T) {
	t.Helper()
	conn := openDB(filepath.Join(t.TempDir(), "test.db"))
	t.Cleanup(func() { conn.Close() })
	db = conn
}

func mustCreateUser(t *testing.T, role string) string {
	t.Helper()
	id := newID()
	if _, err := db.Exec(`INSERT INTO users(id, phone, role) VALUES (?, ?, ?)`, id, id, role); err != nil {
		t.Fatalf("create user: %v", err)
	}
	return id
}

func mustCreateListing(t *testing.T, ownerID, status string) string {
	t.Helper()
	id := newID()
	_, err := db.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, status, expires_at)
		VALUES (?, ?, 'rent', 'yerevan', 'Test str', ?, ?)`, id, ownerID, status, time.Now().Add(72*time.Hour))
	if err != nil {
		t.Fatalf("create listing: %v", err)
	}
	return id
}

func mustSetBalance(t *testing.T, userID string, balance int) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO token_balances(user_id, balance) VALUES (?, ?)
		ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance`, userID, balance)
	if err != nil {
		t.Fatalf("set balance: %v", err)
	}
}

func TestTokenBalanceEmpty(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	balance, err := tokenBalance(db, owner)
	if err != nil {
		t.Fatalf("tokenBalance: %v", err)
	}
	if balance != 0 {
		t.Fatalf("want 0, got %d", balance)
	}
}

func TestPromoteListingSuccess(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	mustSetBalance(t, owner, 150)

	balance, promotedUntil, err := promoteListing(owner, listing, time.Now())
	if err != nil {
		t.Fatalf("promoteListing: %v", err)
	}
	if balance != 50 {
		t.Fatalf("want balance 50, got %d", balance)
	}
	if !promotedUntil.After(time.Now().Add(6 * 24 * time.Hour)) {
		t.Fatalf("promotedUntil too soon: %v", promotedUntil)
	}

	stored, err := tokenBalance(db, owner)
	if err != nil || stored != 50 {
		t.Fatalf("stored balance = %d, %v", stored, err)
	}

	var kind, eventKey string
	var amount int
	var listingID string
	row := db.QueryRow(`SELECT amount, kind, event_key, listing_id FROM token_transactions WHERE user_id = ?`, owner)
	if err := row.Scan(&amount, &kind, &eventKey, &listingID); err != nil {
		t.Fatalf("scan transaction: %v", err)
	}
	if amount != -vipCost || kind != "vip_promote" || listingID != listing {
		t.Fatalf("unexpected transaction: amount=%d kind=%s listing=%s", amount, kind, listingID)
	}
}

func TestPromoteListingInsufficientBalance(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	mustSetBalance(t, owner, 50)

	if _, _, err := promoteListing(owner, listing, time.Now()); err != errTokensInsufficient {
		t.Fatalf("want errTokensInsufficient, got %v", err)
	}
	if balance, _ := tokenBalance(db, owner); balance != 50 {
		t.Fatalf("balance changed to %d", balance)
	}
}

func TestPromoteListingActiveVip(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	mustSetBalance(t, owner, 300)

	if _, _, err := promoteListing(owner, listing, time.Now()); err != nil {
		t.Fatalf("first promote: %v", err)
	}
	if _, _, err := promoteListing(owner, listing, time.Now()); err != errVipActive {
		t.Fatalf("want errVipActive, got %v", err)
	}
	if balance, _ := tokenBalance(db, owner); balance != 200 {
		t.Fatalf("want balance 200 after single charge, got %d", balance)
	}
}

func TestPromoteListingForbidden(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	stranger := mustCreateUser(t, "tenant")
	listing := mustCreateListing(t, owner, "active")
	mustSetBalance(t, stranger, 300)

	if _, _, err := promoteListing(stranger, listing, time.Now()); err != errNotOwner {
		t.Fatalf("want errNotOwner, got %v", err)
	}
}

func TestPromoteListingNotActive(t *testing.T) {
	for _, status := range []string{"flagged", "archived", "rented"} {
		setupTestDB(t)
		owner := mustCreateUser(t, "owner")
		listing := mustCreateListing(t, owner, status)
		mustSetBalance(t, owner, 300)

		if _, _, err := promoteListing(owner, listing, time.Now()); err != errListingNotActive {
			t.Fatalf("status %s: want errListingNotActive, got %v", status, err)
		}
	}
}

func TestPromoteListingNotFound(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	if _, _, err := promoteListing(owner, newID(), time.Now()); err != errListingNotFound {
		t.Fatalf("want errListingNotFound, got %v", err)
	}
}

func TestPromoteListingRollbackOnConflict(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	mustSetBalance(t, owner, 300)

	eventKey := "vip_promote:" + listing + ":none"
	if _, err := db.Exec(`INSERT INTO token_transactions(user_id, amount, kind, event_key, listing_id) VALUES (?, -1, 'manual', ?, ?)`,
		owner, eventKey, listing); err != nil {
		t.Fatalf("seed conflicting transaction: %v", err)
	}

	if _, _, err := promoteListing(owner, listing, time.Now()); err != errVipActive {
		t.Fatalf("want errVipActive from unique conflict, got %v", err)
	}
	if balance, _ := tokenBalance(db, owner); balance != 300 {
		t.Fatalf("balance changed despite rollback: %d", balance)
	}
	var promotedUntil *time.Time
	if err := db.QueryRow(`SELECT promoted_until FROM listings WHERE id = ?`, listing).Scan(&promotedUntil); err != nil {
		t.Fatalf("read listing: %v", err)
	}
	if promotedUntil != nil {
		t.Fatalf("promoted_until set despite rollback: %v", promotedUntil)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE listing_id = ?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 transaction row, got %d", count)
	}
}

func TestPromoteListingConcurrentDoubleRequest(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	mustSetBalance(t, owner, 100)

	var wg sync.WaitGroup
	errs := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, _, err := promoteListing(owner, listing, time.Now())
			errs[i] = err
		}(i)
	}
	wg.Wait()

	successes, conflicts := 0, 0
	for _, err := range errs {
		switch err {
		case nil:
			successes++
		case errVipActive, errTokensInsufficient:
			conflicts++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if successes != 1 || conflicts != 1 {
		t.Fatalf("want exactly one success and one conflict, got %v", errs)
	}
	if balance, _ := tokenBalance(db, owner); balance != 0 {
		t.Fatalf("want balance 0 after single charge, got %d", balance)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE listing_id = ?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 transaction row, got %d", count)
	}
}

func TestRecentTokenTransactionsLimit(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	mustSetBalance(t, owner, 1000)

	var listingIDs []string
	for i := 0; i < 5; i++ {
		id := mustCreateListing(t, owner, "active")
		listingIDs = append(listingIDs, id)
		if _, _, err := promoteListing(owner, id, time.Now()); err != nil {
			t.Fatalf("promote %d: %v", i, err)
		}
	}

	txs, err := recentTokenTransactions(owner, 3)
	if err != nil {
		t.Fatalf("recentTokenTransactions: %v", err)
	}
	if len(txs) != 3 {
		t.Fatalf("want 3 transactions, got %d", len(txs))
	}
	want := []string{listingIDs[4], listingIDs[3], listingIDs[2]}
	for i, tx := range txs {
		if tx.ListingID == nil || *tx.ListingID != want[i] {
			t.Fatalf("order mismatch at %d: %+v", i, tx)
		}
	}
}

func TestHandleGetTokens(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	mustSetBalance(t, owner, 250)

	req := httptest.NewRequest(http.MethodGet, "/api/tokens", nil)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleGetTokens(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var resp struct {
		Balance      int                `json:"balance"`
		VipCost      int                `json:"vipCost"`
		VipDays      int                `json:"vipDays"`
		Transactions []TokenTransaction `json:"transactions"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Balance != 250 || resp.VipCost != 100 || resp.VipDays != 7 {
		t.Fatalf("unexpected response: %+v", resp)
	}
}

func TestHandlePromoteListingErrors(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "flagged")
	mustSetBalance(t, owner, 300)

	req := httptest.NewRequest(http.MethodPost, "/api/listings/"+listing+"/promote", nil)
	req.SetPathValue("id", listing)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handlePromoteListing(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "listing_not_active" {
		t.Fatalf("want listing_not_active, got %q", body.Error)
	}
}

func TestListListingsOrdersPromotedFirst(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	l1 := mustCreateListing(t, owner, "active")
	l2 := mustCreateListing(t, owner, "active")
	mustSetBalance(t, owner, 100)

	if _, _, err := promoteListing(owner, l2, time.Now()); err != nil {
		t.Fatalf("promote: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings", nil)
	rec := httptest.NewRecorder()
	handleListListings(rec, req)

	var out []struct {
		Listing struct {
			ID       string `json:"id"`
			Promoted bool   `json:"promoted"`
		} `json:"listing"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(out) < 2 {
		t.Fatalf("want at least 2 listings, got %d", len(out))
	}
	if out[0].Listing.ID != l2 || !out[0].Listing.Promoted {
		t.Fatalf("want promoted listing %s first, got %+v", l2, out)
	}
	found1 := false
	for _, o := range out {
		if o.Listing.ID == l1 {
			found1 = true
		}
	}
	if !found1 {
		t.Fatalf("listing %s missing from results", l1)
	}
}
