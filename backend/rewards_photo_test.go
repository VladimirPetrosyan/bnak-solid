package main

import (
	"sync"
	"testing"
	"time"
)

func mustCreateActiveListingWithPhotos(t *testing.T, ownerID string, photos int) string {
	t.Helper()
	id := newID()
	_, err := db.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, status, expires_at)
		VALUES (?, ?, 'rent', 'yerevan', 'Test str', 'active', ?)`, id, ownerID, time.Now().Add(72*time.Hour))
	if err != nil {
		t.Fatalf("create active listing: %v", err)
	}
	for i := 0; i < photos; i++ {
		if _, err := db.Exec(`INSERT INTO listing_photos(listing_id, url, position) VALUES (?, ?, ?)`, id, "/uploads/x.jpg", i); err != nil {
			t.Fatalf("seed photo: %v", err)
		}
	}
	return id
}

func loadListingForTest(t *testing.T, id string) *Listing {
	t.Helper()
	l, err := scanListing(db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, id))
	if err != nil {
		t.Fatalf("load listing: %v", err)
	}
	return l
}

func TestFifthPhotoGrantsQualityPhotos(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateActiveListingWithPhotos(t, owner, 4)
	l := loadListingForTest(t, listing)

	if err := addListingPhoto(l, "/uploads/fifth.jpg", time.Now()); err != nil {
		t.Fatalf("addListingPhoto: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardQualityPhotos {
		t.Fatalf("balance = %d, want %d", balance, rewardQualityPhotos)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE kind = ? AND listing_id = ?`, kindQualityPhotos, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 quality_photos transaction, got %d", count)
	}
}

func TestFifthPhotoNoRewardIfNotActive(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "flagged")
	for i := 0; i < 4; i++ {
		db.Exec(`INSERT INTO listing_photos(listing_id, url, position) VALUES (?, ?, ?)`, listing, "/uploads/x.jpg", i)
	}
	l := loadListingForTest(t, listing)

	if err := addListingPhoto(l, "/uploads/fifth.jpg", time.Now()); err != nil {
		t.Fatalf("addListingPhoto: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0 for non-active listing", balance)
	}
}

func TestFifthPhotoRewardOnlyOnce(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateActiveListingWithPhotos(t, owner, 4)
	l := loadListingForTest(t, listing)

	if err := addListingPhoto(l, "/uploads/5.jpg", time.Now()); err != nil {
		t.Fatalf("photo 5: %v", err)
	}
	if err := addListingPhoto(l, "/uploads/6.jpg", time.Now()); err != nil {
		t.Fatalf("photo 6: %v", err)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardQualityPhotos {
		t.Fatalf("balance = %d, want %d (single grant)", balance, rewardQualityPhotos)
	}
}

func TestFifthPhotoConcurrentUploads(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateActiveListingWithPhotos(t, owner, 4)
	l := loadListingForTest(t, listing)

	var wg sync.WaitGroup
	errs := make([]error, 2)
	urls := []string{"/uploads/a.jpg", "/uploads/b.jpg"}
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			errs[i] = addListingPhoto(l, urls[i], time.Now())
		}(i)
	}
	wg.Wait()

	for _, err := range errs {
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardQualityPhotos {
		t.Fatalf("balance = %d, want %d (single grant)", balance, rewardQualityPhotos)
	}
	var photoCount int
	db.QueryRow(`SELECT COUNT(*) FROM listing_photos WHERE listing_id = ?`, listing).Scan(&photoCount)
	if photoCount != 6 {
		t.Fatalf("want 6 photo rows, got %d", photoCount)
	}
}

func TestFifthPhotoRollbackDoesNotOrphanRow(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateActiveListingWithPhotos(t, owner, 4)
	l := loadListingForTest(t, listing)

	if _, err := db.Exec(`CREATE TRIGGER force_fail_quality_photos BEFORE INSERT ON token_transactions
		WHEN NEW.kind = 'quality_photos' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if err := addListingPhoto(l, "/uploads/fifth.jpg", time.Now()); err == nil {
		t.Fatalf("want error from forced ledger failure")
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_photos WHERE listing_id = ?`, listing).Scan(&count)
	if count != 4 {
		t.Fatalf("want no orphan photo row, count = %d", count)
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0", balance)
	}
}
