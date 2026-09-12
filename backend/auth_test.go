package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func verifyPhoneForTest(t *testing.T, phone string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO otp_codes(phone, code, verified, expires_at) VALUES (?, '1111', 1, ?)
		ON CONFLICT(phone) DO UPDATE SET code=excluded.code, verified=excluded.verified, expires_at=excluded.expires_at`,
		phone, time.Now().Add(10*time.Minute)); err != nil {
		t.Fatalf("verify phone: %v", err)
	}
}

func registerRequest(body registerReq) *httptest.ResponseRecorder {
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(b))
	rec := httptest.NewRecorder()
	handleRegister(rec, req)
	return rec
}

func TestHandleRegisterRequiresAcceptedLegal(t *testing.T) {
	setupTestDB(t)
	verifyPhoneForTest(t, "37411111111")
	rec := registerRequest(registerReq{
		Phone: "37411111111", Password: "password1", Name: "Ann", Role: "owner",
		AcceptedLegal: false, LegalVersion: currentLegalVersion, LegalLanguage: "ru",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]string
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["error"] != "legal not accepted" {
		t.Fatalf("error = %q, want %q", out["error"], "legal not accepted")
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users WHERE phone = ?`, "37411111111").Scan(&count)
	if count != 0 {
		t.Fatalf("want no user created, got %d", count)
	}
}

func TestHandleRegisterRejectsWrongLegalVersion(t *testing.T) {
	setupTestDB(t)
	verifyPhoneForTest(t, "37411111112")
	rec := registerRequest(registerReq{
		Phone: "37411111112", Password: "password1", Name: "Ann", Role: "owner",
		AcceptedLegal: true, LegalVersion: "2020-01-01", LegalLanguage: "ru",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]string
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["error"] != "legal version outdated" {
		t.Fatalf("error = %q, want %q", out["error"], "legal version outdated")
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users WHERE phone = ?`, "37411111112").Scan(&count)
	if count != 0 {
		t.Fatalf("want no user created, got %d", count)
	}
}

func TestHandleRegisterRejectsInvalidLegalLanguage(t *testing.T) {
	setupTestDB(t)
	verifyPhoneForTest(t, "37411111113")
	rec := registerRequest(registerReq{
		Phone: "37411111113", Password: "password1", Name: "Ann", Role: "owner",
		AcceptedLegal: true, LegalVersion: currentLegalVersion, LegalLanguage: "fr",
	})
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]string
	json.Unmarshal(rec.Body.Bytes(), &out)
	if out["error"] != "invalid legal language" {
		t.Fatalf("error = %q, want %q", out["error"], "invalid legal language")
	}
}

func TestHandleRegisterSucceedsAndPersistsConsent(t *testing.T) {
	setupTestDB(t)
	verifyPhoneForTest(t, "37411111114")
	rec := registerRequest(registerReq{
		Phone: "37411111114", Password: "password1", Name: "Ann", Role: "owner",
		AcceptedLegal: true, LegalVersion: currentLegalVersion, LegalLanguage: "HY",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Token string `json:"token"`
		User  User   `json:"user"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if out.Token == "" {
		t.Fatalf("expected non-empty token")
	}
	if out.User.LegalLanguage != "hy" {
		t.Fatalf("LegalLanguage = %q, want normalized hy", out.User.LegalLanguage)
	}
	if out.User.LegalVersion != currentLegalVersion {
		t.Fatalf("LegalVersion = %q, want %q", out.User.LegalVersion, currentLegalVersion)
	}
	if out.User.LegalAcceptedAt == nil {
		t.Fatalf("want LegalAcceptedAt in response")
	}
}

func TestHandleRegisterDuplicatePhoneStillRejected(t *testing.T) {
	setupTestDB(t)
	verifyPhoneForTest(t, "37411111115")
	first := registerRequest(registerReq{
		Phone: "37411111115", Password: "password1", Name: "Ann", Role: "owner",
		AcceptedLegal: true, LegalVersion: currentLegalVersion, LegalLanguage: "ru",
	})
	if first.Code != http.StatusOK {
		t.Fatalf("first register status = %d, body = %s", first.Code, first.Body.String())
	}
	verifyPhoneForTest(t, "37411111115")
	second := registerRequest(registerReq{
		Phone: "37411111115", Password: "password2", Name: "Someone", Role: "tenant",
		AcceptedLegal: true, LegalVersion: currentLegalVersion, LegalLanguage: "ru",
	})
	if second.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", second.Code, second.Body.String())
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM users WHERE phone = ?`, "37411111115").Scan(&count)
	if count != 1 {
		t.Fatalf("want exactly 1 user, got %d", count)
	}
}
