package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRegisterUserGrantsSignupAndProfile(t *testing.T) {
	setupTestDB(t)
	user, token, err := registerUser("37411111111", "password1", "Ann Petrosyan", "owner", "ru", time.Now())
	if err != nil {
		t.Fatalf("registerUser: %v", err)
	}
	if token == "" {
		t.Fatalf("expected non-empty token")
	}
	balance, err := tokenBalance(db, user.ID)
	if err != nil || balance != 20 {
		t.Fatalf("balance = %d, %v, want 20", balance, err)
	}
	txs, err := recentTokenTransactions(user.ID, 10)
	if err != nil || len(txs) != 2 {
		t.Fatalf("transactions = %+v, %v", txs, err)
	}
	kinds := map[string]bool{}
	for _, tx := range txs {
		kinds[tx.Kind] = true
		if tx.EventKey == "" {
			t.Fatalf("empty event key: %+v", tx)
		}
	}
	if !kinds[kindSignup] || !kinds[kindProfileComplete] {
		t.Fatalf("want signup and profile_complete, got %+v", txs)
	}
	if user.LegalVersion != currentLegalVersion {
		t.Fatalf("LegalVersion = %q, want %q", user.LegalVersion, currentLegalVersion)
	}
	if user.LegalAcceptedAt == nil || user.LegalAcceptedAt.IsZero() {
		t.Fatalf("want LegalAcceptedAt set, got %v", user.LegalAcceptedAt)
	}
	if user.LegalLanguage != "ru" {
		t.Fatalf("LegalLanguage = %q, want ru", user.LegalLanguage)
	}
	var version, language string
	var acceptedAt sql.NullTime
	if err := db.QueryRow(`SELECT legal_version, legal_accepted_at, legal_language FROM users WHERE id = ?`, user.ID).
		Scan(&version, &acceptedAt, &language); err != nil {
		t.Fatalf("read persisted legal consent: %v", err)
	}
	if version != currentLegalVersion || !acceptedAt.Valid || language != "ru" {
		t.Fatalf("persisted legal consent = (%q, valid=%v, %q), want (%q, true, ru)", version, acceptedAt.Valid, language, currentLegalVersion)
	}
}

func TestRegisterUserEmptyNameNoProfileReward(t *testing.T) {
	setupTestDB(t)
	user, _, err := registerUser("37433333333", "password1", "   ", "owner", "ru", time.Now())
	if err != nil {
		t.Fatalf("registerUser: %v", err)
	}
	balance, _ := tokenBalance(db, user.ID)
	if balance != rewardSignup {
		t.Fatalf("balance = %d, want %d (signup only)", balance, rewardSignup)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE user_id = ? AND kind = ?`, user.ID, kindProfileComplete).Scan(&count)
	if count != 0 {
		t.Fatalf("want no profile_complete transaction, got %d", count)
	}
}

func TestRegisterUserUnknownRoleNoProfileReward(t *testing.T) {
	setupTestDB(t)
	phones := map[string]string{"": "37444444441", "manager": "37444444442"}
	for _, role := range []string{"", "manager"} {
		user, _, err := registerUser(phones[role], "password1", "Ann", role, "ru", time.Now())
		if err != nil {
			t.Fatalf("registerUser role=%q: %v", role, err)
		}
		balance, _ := tokenBalance(db, user.ID)
		if balance != rewardSignup {
			t.Fatalf("role=%q balance = %d, want %d (signup only)", role, balance, rewardSignup)
		}
		var count int
		db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE user_id = ? AND kind = ?`, user.ID, kindProfileComplete).Scan(&count)
		if count != 0 {
			t.Fatalf("role=%q want no profile_complete transaction, got %d", role, count)
		}
		if user.Role != "tenant" {
			t.Fatalf("role=%q want fallback to tenant, got %s", role, user.Role)
		}
	}
}

func TestRegisterUserPhoneAlreadyRegistered(t *testing.T) {
	setupTestDB(t)
	if _, _, err := registerUser("37411111111", "password1", "Ann", "owner", "ru", time.Now()); err != nil {
		t.Fatalf("first register: %v", err)
	}
	if _, _, err := registerUser("37411111111", "password2", "Someone Else", "tenant", "ru", time.Now()); err != errPhoneTaken {
		t.Fatalf("want errPhoneTaken, got %v", err)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users WHERE phone = ?`, "37411111111").Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 user, got %d", count)
	}
}

func TestGrantTokensFirstAndDuplicateCall(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	granted, err := grantTokens(tx, time.Now(), grantInput{userID: owner, amount: 10, kind: kindSignup, eventKey: "signup:" + owner})
	if err != nil || !granted {
		t.Fatalf("first grant: granted=%v err=%v, want true, nil", granted, err)
	}
	granted, err = grantTokens(tx, time.Now(), grantInput{userID: owner, amount: 10, kind: kindSignup, eventKey: "signup:" + owner})
	if err != nil || granted {
		t.Fatalf("duplicate grant: granted=%v err=%v, want false, nil", granted, err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit: %v", err)
	}

	balance, _ := tokenBalance(db, owner)
	if balance != 10 {
		t.Fatalf("balance = %d, want 10", balance)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE user_id = ?`, owner).Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 transaction, got %d", count)
	}
}

func TestRegisterUserRollbackOnLedgerFailure(t *testing.T) {
	setupTestDB(t)
	if _, err := db.Exec(`CREATE TRIGGER force_fail_profile BEFORE INSERT ON token_transactions
		WHEN NEW.kind = 'profile_complete' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}
	if _, _, err := registerUser("37422222222", "password1", "Ann", "owner", "ru", time.Now()); err == nil {
		t.Fatalf("want error from forced ledger failure")
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users WHERE phone = ?`, "37422222222").Scan(&count)
	if count != 0 {
		t.Fatalf("want registration rolled back, found %d users", count)
	}
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions`).Scan(&count)
	if count != 0 {
		t.Fatalf("want no leftover transactions, got %d", count)
	}
}

func putMe(t *testing.T, userID, name, role string) *httptest.ResponseRecorder {
	t.Helper()
	u := &User{}
	if err := db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, userID).
		Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Ini, &u.CreatedAt); err != nil {
		t.Fatalf("load user: %v", err)
	}
	body, _ := json.Marshal(updateMeReq{Name: name, Role: role})
	req := httptest.NewRequest(http.MethodPut, "/api/me", bytes.NewReader(body))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, u))
	rec := httptest.NewRecorder()
	handleUpdateMe(rec, req)
	return rec
}

func TestUpdateMeGrantsProfileRewardOnceForLegacyUser(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")

	rec := putMe(t, owner, "Ann Petrosyan", "owner")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	balance, _ := tokenBalance(db, owner)
	if balance != rewardProfile {
		t.Fatalf("balance = %d, want %d", balance, rewardProfile)
	}

	rec = putMe(t, owner, "Ann Petrosyan", "owner")
	if rec.Code != http.StatusOK {
		t.Fatalf("second update status = %d, body = %s", rec.Code, rec.Body.String())
	}
	balance, _ = tokenBalance(db, owner)
	if balance != rewardProfile {
		t.Fatalf("balance after repeat = %d, want %d (no duplicate)", balance, rewardProfile)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM token_transactions WHERE user_id = ? AND kind = ?`, owner, kindProfileComplete).Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 profile_complete transaction, got %d", count)
	}
}

func TestUpdateMeUnknownRoleNoProfileReward(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "legacyrole")
	if _, err := db.Exec(`UPDATE users SET name = ? WHERE id = ?`, "Ann", owner); err != nil {
		t.Fatalf("set name: %v", err)
	}

	rec := putMe(t, owner, "", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	balance, _ := tokenBalance(db, owner)
	if balance != 0 {
		t.Fatalf("balance = %d, want 0 for unknown role", balance)
	}
}
