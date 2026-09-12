package main

import (
	"sync"
	"testing"
	"time"
)

func mustCreatePendingListing(t *testing.T, ownerID, cadastreCode string, photos int) string {
	t.Helper()
	id := newID()
	_, err := db.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, status, cadastre_code, expires_at)
		VALUES (?, ?, 'rent', 'yerevan', 'Test str', 'pending', ?, ?)`, id, ownerID, cadastreCode, time.Now().Add(72*time.Hour))
	if err != nil {
		t.Fatalf("create pending listing: %v", err)
	}
	for i := 0; i < photos; i++ {
		if _, err := db.Exec(`INSERT INTO listing_photos(listing_id, url, position) VALUES (?, ?, ?)`, id, "/uploads/x.jpg", i); err != nil {
			t.Fatalf("seed photo: %v", err)
		}
	}
	return id
}

func TestApprovalGrantsFirstApprovedOnly(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreatePendingListing(t, owner, "", 0)

	if err := setListingStatus(listing, "active", time.Now()); err != nil {
		t.Fatalf("setListingStatus: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardFirstApproved {
		t.Fatalf("balance = %d, want %d", balance, rewardFirstApproved)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE user_id = ?`, owner).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 transaction, got %d", count)
	}
}

func TestApprovalGrantsCadastreWhenPresent(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreatePendingListing(t, owner, "CAD-123", 0)

	if err := setListingStatus(listing, "active", time.Now()); err != nil {
		t.Fatalf("setListingStatus: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardFirstApproved+rewardCadastre {
		t.Fatalf("balance = %d, want %d", balance, rewardFirstApproved+rewardCadastre)
	}
}

func TestApprovalGrantsPhotosWhenFivePlus(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreatePendingListing(t, owner, "", 5)

	if err := setListingStatus(listing, "active", time.Now()); err != nil {
		t.Fatalf("setListingStatus: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardFirstApproved+rewardQualityPhotos {
		t.Fatalf("balance = %d, want %d", balance, rewardFirstApproved+rewardQualityPhotos)
	}
}

func TestApprovalRepeatIsNoOp(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreatePendingListing(t, owner, "CAD-1", 5)

	if err := setListingStatus(listing, "active", time.Now()); err != nil {
		t.Fatalf("first approve: %v", err)
	}
	want := rewardFirstApproved + rewardCadastre + rewardQualityPhotos
	balance, _ := tokenBalance(db, owner)
	if balance != want {
		t.Fatalf("balance = %d, want %d", balance, want)
	}

	if err := setListingStatus(listing, "flagged", time.Now()); err != nil {
		t.Fatalf("flag: %v", err)
	}
	if err := setListingStatus(listing, "active", time.Now()); err != nil {
		t.Fatalf("re-approve: %v", err)
	}
	balance, _ = tokenBalance(db, owner)
	if balance != want {
		t.Fatalf("balance after repeat = %d, want %d (no duplicate)", balance, want)
	}
}

func TestApprovalRollbackOnLedgerFailure(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreatePendingListing(t, owner, "", 0)

	if _, err := db.Exec(`CREATE TRIGGER force_fail_first_approved BEFORE INSERT ON token_transactions
		WHEN NEW.kind = 'first_approved_listing' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if err := setListingStatus(listing, "active", time.Now()); err == nil {
		t.Fatalf("want error from forced ledger failure")
	}
	var status string
	db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listing).Scan(&status)
	if status != "pending" {
		t.Fatalf("want status still pending, got %s", status)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0 after rollback", balance)
	}
}

func TestApprovalConcurrentDoubleApprove(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreatePendingListing(t, owner, "", 0)

	var wg sync.WaitGroup
	errs := make([]error, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			errs[i] = setListingStatus(listing, "active", time.Now())
		}(i)
	}
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardFirstApproved {
		t.Fatalf("balance = %d, want %d (single grant)", balance, rewardFirstApproved)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE kind = ?`, kindFirstApprovedListing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 first_approved_listing transaction, got %d", count)
	}
}

func TestApprovalNotFound(t *testing.T) {
	setupTestDB(t)
	if err := setListingStatus(newID(), "active", time.Now()); err != errListingNotFound {
		t.Fatalf("want errListingNotFound, got %v", err)
	}
}

func TestApprovalDeleteRecreateDoesNotRepeatFirstApproved(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	first := mustCreatePendingListing(t, owner, "", 0)
	if err := setListingStatus(first, "active", time.Now()); err != nil {
		t.Fatalf("approve first: %v", err)
	}
	db.Exec(`DELETE FROM listings WHERE id = ?`, first)

	second := mustCreatePendingListing(t, owner, "CAD-2", 0)
	if err := setListingStatus(second, "active", time.Now()); err != nil {
		t.Fatalf("approve second: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardFirstApproved+rewardCadastre {
		t.Fatalf("balance = %d, want %d (no repeat first_approved)", balance, rewardFirstApproved+rewardCadastre)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE kind = ?`, kindFirstApprovedListing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 first_approved_listing transaction total, got %d", count)
	}
}
