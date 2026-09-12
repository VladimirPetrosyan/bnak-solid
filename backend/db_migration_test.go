package main

import (
	"database/sql"
	"path/filepath"
	"testing"
)

const legacySchema = `
CREATE TABLE users (
	id TEXT PRIMARY KEY,
	phone TEXT UNIQUE NOT NULL,
	name TEXT NOT NULL DEFAULT '',
	role TEXT NOT NULL DEFAULT 'tenant',
	ini TEXT NOT NULL DEFAULT '',
	created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE listings (
	id TEXT PRIMARY KEY,
	owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	deal TEXT NOT NULL,
	city TEXT NOT NULL,
	district TEXT NOT NULL DEFAULT '',
	street TEXT NOT NULL DEFAULT '',
	lat REAL NOT NULL DEFAULT 0,
	lng REAL NOT NULL DEFAULT 0,
	price INTEGER NOT NULL DEFAULT 0,
	rooms INTEGER NOT NULL DEFAULT 0,
	area INTEGER NOT NULL DEFAULT 0,
	floor INTEGER NOT NULL DEFAULT 1,
	floors_total INTEGER NOT NULL DEFAULT 1,
	features TEXT NOT NULL DEFAULT '[]',
	description TEXT NOT NULL DEFAULT '',
	deposit TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'fresh',
	confirmed_at DATETIME NOT NULL DEFAULT (datetime('now')),
	expires_at DATETIME NOT NULL,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
`

func TestMigrateAddsPromotedUntilToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, expires_at)
		VALUES ('l1', 'u1', 'rent', 'yerevan', 'Old str', datetime('now', '+3 days'))`); err != nil {
		t.Fatalf("seed listing: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	assertMigratedPromotedSchema(t, conn)

	var street string
	if err := conn.QueryRow(`SELECT street FROM listings WHERE id = 'l1'`).Scan(&street); err != nil {
		t.Fatalf("read legacy row: %v", err)
	}
	if street != "Old str" {
		t.Fatalf("legacy row lost: street=%q", street)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
	assertMigratedPromotedSchema(t, conn)
}

func assertMigratedPromotedSchema(t *testing.T, conn *sql.DB) {
	t.Helper()
	rows, err := conn.Query(`PRAGMA table_info(listings)`)
	if err != nil {
		t.Fatalf("table_info: %v", err)
	}
	defer rows.Close()
	found := false
	for rows.Next() {
		var cid int
		var name, ctype string
		var notnull, pk int
		var dflt any
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			t.Fatalf("scan column: %v", err)
		}
		if name == "promoted_until" {
			found = true
		}
	}
	if !found {
		t.Fatal("promoted_until column missing")
	}

	var indexName string
	err = conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_listings_promoted'`).Scan(&indexName)
	if err != nil {
		t.Fatalf("idx_listings_promoted missing: %v", err)
	}
}

func TestMigrateAddsListingDocumentsTableToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, expires_at)
		VALUES ('l1', 'u1', 'rent', 'yerevan', 'Old str', datetime('now', '+3 days'))`); err != nil {
		t.Fatalf("seed listing: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	var tableName string
	if err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'listing_documents'`).Scan(&tableName); err != nil {
		t.Fatalf("listing_documents table missing after migration: %v", err)
	}

	if _, err := conn.Exec(`INSERT INTO listing_documents(id, listing_id, original_name, stored_name, mime_type, size, sha256)
		VALUES ('d1', 'l1', 'cert.pdf', 'stored.pdf', 'application/pdf', 10, 'abc')`); err != nil {
		t.Fatalf("insert into new table failed: %v", err)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
}

func TestMigrateAddsListingRevisionsTableToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, expires_at)
		VALUES ('l1', 'u1', 'rent', 'yerevan', 'Old str', datetime('now', '+3 days'))`); err != nil {
		t.Fatalf("seed listing: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	var tableName string
	if err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'listing_revisions'`).Scan(&tableName); err != nil {
		t.Fatalf("listing_revisions table missing after migration: %v", err)
	}
	var indexName string
	if err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_listing_revisions_one_pending'`).Scan(&indexName); err != nil {
		t.Fatalf("idx_listing_revisions_one_pending missing: %v", err)
	}

	if _, err := conn.Exec(`INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status) VALUES ('r1', 'l1', 'u1', '{}', 'pending')`); err != nil {
		t.Fatalf("insert first pending revision failed: %v", err)
	}
	if _, err := conn.Exec(`INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status) VALUES ('r2', 'l1', 'u1', '{}', 'pending')`); err == nil {
		t.Fatalf("want unique constraint violation for a second pending revision on the same listing")
	}
	if _, err := conn.Exec(`INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status) VALUES ('r3', 'l1', 'u1', '{}', 'rejected')`); err != nil {
		t.Fatalf("resolved revisions should not collide with the partial index: %v", err)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
}

func TestMigrateAddsLegalConsentColumnsToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	var legalVersion, legalLanguage string
	var legalAcceptedAt sql.NullTime
	if err := conn.QueryRow(`SELECT legal_version, legal_accepted_at, legal_language FROM users WHERE id = 'u1'`).
		Scan(&legalVersion, &legalAcceptedAt, &legalLanguage); err != nil {
		t.Fatalf("read legacy row: %v", err)
	}
	if legalVersion != "" || legalAcceptedAt.Valid || legalLanguage != "" {
		t.Fatalf("legacy user must not look like it accepted anything: version=%q acceptedValid=%v language=%q",
			legalVersion, legalAcceptedAt.Valid, legalLanguage)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
	if err := conn.QueryRow(`SELECT legal_version, legal_accepted_at, legal_language FROM users WHERE id = 'u1'`).
		Scan(&legalVersion, &legalAcceptedAt, &legalLanguage); err != nil {
		t.Fatalf("read legacy row after second migrate: %v", err)
	}
	if legalVersion != "" || legalAcceptedAt.Valid || legalLanguage != "" {
		t.Fatalf("idempotent migrate changed legacy consent state: version=%q acceptedValid=%v language=%q",
			legalVersion, legalAcceptedAt.Valid, legalLanguage)
	}
}

func TestMigrateAddsFavoritesListingIndexToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`CREATE TABLE favorites (
		user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
		created_at DATETIME NOT NULL DEFAULT (datetime('now')),
		PRIMARY KEY (user_id, listing_id)
	)`); err != nil {
		t.Fatalf("create legacy favorites table: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, expires_at)
		VALUES ('l1', 'u1', 'rent', 'yerevan', 'Old str', datetime('now', '+3 days'))`); err != nil {
		t.Fatalf("seed listing: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO favorites(user_id, listing_id) VALUES ('u1', 'l1')`); err != nil {
		t.Fatalf("seed favorite: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	var indexName, indexedColumn string
	if err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_favorites_listing'`).Scan(&indexName); err != nil {
		t.Fatalf("idx_favorites_listing missing: %v", err)
	}
	rows, err := conn.Query(`PRAGMA index_info(idx_favorites_listing)`)
	if err != nil {
		t.Fatalf("index_info: %v", err)
	}
	defer rows.Close()
	found := false
	for rows.Next() {
		var seqno, cid int
		if err := rows.Scan(&seqno, &cid, &indexedColumn); err != nil {
			t.Fatalf("scan index_info: %v", err)
		}
		if indexedColumn == "listing_id" {
			found = true
		}
	}
	if !found {
		t.Fatal("idx_favorites_listing does not cover listing_id")
	}

	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM favorites WHERE user_id = 'u1' AND listing_id = 'l1'`).Scan(&count); err != nil {
		t.Fatalf("read legacy favorite: %v", err)
	}
	if count != 1 {
		t.Fatalf("legacy favorite lost: count=%d", count)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
}

func TestMigrateAddsListingViewsTableToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, expires_at)
		VALUES ('l1', 'u1', 'rent', 'yerevan', 'Old str', datetime('now', '+3 days'))`); err != nil {
		t.Fatalf("seed listing: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	var tableName string
	if err := conn.QueryRow(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'listing_views'`).Scan(&tableName); err != nil {
		t.Fatalf("listing_views table missing after migration: %v", err)
	}

	if _, err := conn.Exec(`INSERT INTO listing_views(listing_id, viewer_hash) VALUES ('l1', 'hash1')`); err != nil {
		t.Fatalf("insert into new table failed: %v", err)
	}
	if _, err := conn.Exec(`INSERT INTO listing_views(listing_id, viewer_hash) VALUES ('l1', 'hash1')`); err == nil {
		t.Fatalf("want unique constraint violation for a repeat (listing_id, viewer_hash)")
	}
	if _, err := conn.Exec(`DELETE FROM listings WHERE id = 'l1'`); err != nil {
		t.Fatalf("delete listing: %v", err)
	}
	var count int
	if err := conn.QueryRow(`SELECT COUNT(*) FROM listing_views WHERE listing_id = 'l1'`).Scan(&count); err != nil {
		t.Fatalf("count listing_views: %v", err)
	}
	if count != 0 {
		t.Fatalf("listing_views rows after cascade delete = %d, want 0", count)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
}

func TestMigrateAddsRepairConditionToLegacyDB(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.db")

	seed, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("open legacy db: %v", err)
	}
	if _, err := seed.Exec(legacySchema); err != nil {
		t.Fatalf("create legacy schema: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO users(id, phone, name) VALUES ('u1', '37455000000', 'Legacy Owner')`); err != nil {
		t.Fatalf("seed user: %v", err)
	}
	if _, err := seed.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, expires_at)
		VALUES ('l1', 'u1', 'rent', 'yerevan', 'Old str', datetime('now', '+3 days'))`); err != nil {
		t.Fatalf("seed listing: %v", err)
	}
	seed.Close()

	conn := openDB(path)
	defer conn.Close()

	var notnull int
	rows, err := conn.Query(`PRAGMA table_info(listings)`)
	if err != nil {
		t.Fatalf("table_info: %v", err)
	}
	found := false
	for rows.Next() {
		var cid int
		var name, ctype string
		var pk int
		var dflt any
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dflt, &pk); err != nil {
			t.Fatalf("scan column: %v", err)
		}
		if name == "repair_condition" {
			found = true
		}
	}
	rows.Close()
	if !found {
		t.Fatal("repair_condition column missing")
	}
	if notnull != 1 {
		t.Fatal("repair_condition should be NOT NULL")
	}

	var repairCondition string
	if err := conn.QueryRow(`SELECT repair_condition FROM listings WHERE id = 'l1'`).Scan(&repairCondition); err != nil {
		t.Fatalf("read legacy row: %v", err)
	}
	if repairCondition != "unspecified" {
		t.Fatalf("legacy repair_condition = %q, want unspecified default", repairCondition)
	}
	if validRepairConditions[repairCondition] {
		t.Fatalf("legacy default %q must not collide with a real enum value", repairCondition)
	}

	if err := migrate(conn); err != nil {
		t.Fatalf("second migrate run: %v", err)
	}
	if err := conn.QueryRow(`SELECT repair_condition FROM listings WHERE id = 'l1'`).Scan(&repairCondition); err != nil {
		t.Fatalf("read legacy row after second migrate: %v", err)
	}
	if repairCondition != "unspecified" {
		t.Fatalf("repair_condition changed after idempotent migrate: %q", repairCondition)
	}
}
