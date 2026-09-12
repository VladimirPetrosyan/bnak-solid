package main

import (
	"path/filepath"
	"testing"
	"time"
)

func testSnapshot() exchangeRateSnapshot {
	return exchangeRateSnapshot{
		USD:         exchangeRate{Amount: 1, Rate: 365.38},
		RUB:         exchangeRate{Amount: 1, Rate: 4.3633},
		PublishedAt: time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC),
		UpdatedAt:   time.Date(2026, 8, 24, 10, 0, 0, 0, time.UTC),
	}
}

func TestLoadExchangeRateSnapshotEmpty(t *testing.T) {
	setupTestDB(t)
	_, ok, err := loadExchangeRateSnapshot()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if ok {
		t.Fatal("want no snapshot before first save")
	}
}

func TestSaveAndLoadExchangeRateSnapshot(t *testing.T) {
	setupTestDB(t)
	want := testSnapshot()
	if err := saveExchangeRateSnapshot(want); err != nil {
		t.Fatalf("save: %v", err)
	}
	got, ok, err := loadExchangeRateSnapshot()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if !ok {
		t.Fatal("want snapshot present")
	}
	if got.USD != want.USD || got.RUB != want.RUB {
		t.Fatalf("got %+v, want %+v", got, want)
	}
	if !got.PublishedAt.Equal(want.PublishedAt) || !got.UpdatedAt.Equal(want.UpdatedAt) {
		t.Fatalf("timestamps mismatch: got %+v, want %+v", got, want)
	}
}

func TestSaveExchangeRateSnapshotOverwritesSingleton(t *testing.T) {
	setupTestDB(t)
	first := testSnapshot()
	if err := saveExchangeRateSnapshot(first); err != nil {
		t.Fatalf("save first: %v", err)
	}
	second := first
	second.USD.Rate = 370.12
	second.UpdatedAt = first.UpdatedAt.Add(time.Hour)
	if err := saveExchangeRateSnapshot(second); err != nil {
		t.Fatalf("save second: %v", err)
	}
	got, ok, err := loadExchangeRateSnapshot()
	if err != nil || !ok {
		t.Fatalf("load: ok=%v err=%v", ok, err)
	}
	if got.USD.Rate != 370.12 {
		t.Fatalf("want updated rate, got %+v", got.USD)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM exchange_rate_snapshot`).Scan(&count); err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 1 {
		t.Fatalf("want a single singleton row, got %d", count)
	}
}

func insertRawExchangeRateSnapshot(t *testing.T, s exchangeRateSnapshot) {
	t.Helper()
	if _, err := db.Exec(`
		INSERT INTO exchange_rate_snapshot(id, usd_amount, usd_rate, rub_amount, rub_rate, published_at, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			usd_amount = excluded.usd_amount,
			usd_rate = excluded.usd_rate,
			rub_amount = excluded.rub_amount,
			rub_rate = excluded.rub_rate,
			published_at = excluded.published_at,
			updated_at = excluded.updated_at`,
		s.USD.Amount, s.USD.Rate, s.RUB.Amount, s.RUB.Rate, s.PublishedAt, s.UpdatedAt); err != nil {
		t.Fatalf("seed raw row: %v", err)
	}
}

func TestLoadExchangeRateSnapshotRejectsUpdatedBeforePublished(t *testing.T) {
	setupTestDB(t)
	s := testSnapshot()
	s.UpdatedAt = s.PublishedAt.Add(-time.Hour)
	insertRawExchangeRateSnapshot(t, s)
	if _, ok, err := loadExchangeRateSnapshot(); err == nil || ok {
		t.Fatalf("want load to reject updated_at before published_at: ok=%v err=%v", ok, err)
	}
}

func TestLoadExchangeRateSnapshotRejectsZeroPublishedAt(t *testing.T) {
	setupTestDB(t)
	s := testSnapshot()
	s.PublishedAt = time.Time{}
	insertRawExchangeRateSnapshot(t, s)
	if _, ok, err := loadExchangeRateSnapshot(); err == nil || ok {
		t.Fatalf("want load to reject a zero published_at: ok=%v err=%v", ok, err)
	}
}

func TestSaveExchangeRateSnapshotRejectsNonPositiveRate(t *testing.T) {
	setupTestDB(t)
	bad := testSnapshot()
	bad.USD.Rate = 0
	if err := saveExchangeRateSnapshot(bad); err == nil {
		t.Fatal("want error saving a non-positive rate")
	}
	if _, ok, err := loadExchangeRateSnapshot(); err != nil || ok {
		t.Fatalf("a rejected save must not persist a row: ok=%v err=%v", ok, err)
	}
}

func TestSaveExchangeRateSnapshotRejectsUpdatedBeforePublished(t *testing.T) {
	setupTestDB(t)
	bad := testSnapshot()
	bad.UpdatedAt = bad.PublishedAt.Add(-time.Hour)
	if err := saveExchangeRateSnapshot(bad); err == nil {
		t.Fatal("want error saving updated_at before published_at")
	}
	if _, ok, err := loadExchangeRateSnapshot(); err != nil || ok {
		t.Fatalf("a rejected save must not persist a row: ok=%v err=%v", ok, err)
	}
}

func TestExchangeRateSnapshotPersistsAcrossRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "exrates.db")
	conn := openDB(path)
	db = conn
	want := testSnapshot()
	if err := saveExchangeRateSnapshot(want); err != nil {
		t.Fatalf("save: %v", err)
	}
	conn.Close()

	reopened := openDB(path)
	defer reopened.Close()
	db = reopened

	got, ok, err := loadExchangeRateSnapshot()
	if err != nil || !ok {
		t.Fatalf("load after reopen: ok=%v err=%v", ok, err)
	}
	if got.USD != want.USD || got.RUB != want.RUB {
		t.Fatalf("snapshot lost across restart: got %+v, want %+v", got, want)
	}
}
