package main

import (
	"bytes"
	"context"
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

func authedRequest(t *testing.T, u *User, token, path string, body any, handler http.HandlerFunc) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(body)
	req := httptest.NewRequest(http.MethodPut, path, bytes.NewReader(b))
	req.Header.Set("Authorization", "Bearer "+token)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, u))
	rec := httptest.NewRecorder()
	handler(rec, req)
	return rec
}

func TestHandleUpdatePhone(t *testing.T) {
	setupTestDB(t)
	u, token, err := registerUser("37422222221", "password1", "Ann", "owner", "ru", time.Now())
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := registerUser("37422222222", "password1", "Bob", "owner", "ru", time.Now()); err != nil {
		t.Fatal(err)
	}

	if rec := authedRequest(t, u, token, "/api/me/phone", updatePhoneReq{Phone: "+374 22 222 223"}, handleUpdatePhone); rec.Code != http.StatusBadRequest {
		t.Fatalf("unverified: status = %d, body = %s", rec.Code, rec.Body.String())
	}

	verifyPhoneForTest(t, "37422222222")
	if rec := authedRequest(t, u, token, "/api/me/phone", updatePhoneReq{Phone: "37422222222"}, handleUpdatePhone); rec.Code != http.StatusBadRequest {
		t.Fatalf("taken: status = %d, body = %s", rec.Code, rec.Body.String())
	}

	verifyPhoneForTest(t, "37422222223")
	if rec := authedRequest(t, u, token, "/api/me/phone", updatePhoneReq{Phone: "+374 22 222 223"}, handleUpdatePhone); rec.Code != http.StatusOK {
		t.Fatalf("ok: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var phone string
	db.QueryRow(`SELECT phone FROM users WHERE id = ?`, u.ID).Scan(&phone)
	if phone != "37422222223" {
		t.Fatalf("phone = %q", phone)
	}
}

func TestHandleUpdatePassword(t *testing.T) {
	setupTestDB(t)
	u, token, err := registerUser("37433333331", "password1", "Ann", "owner", "ru", time.Now())
	if err != nil {
		t.Fatal(err)
	}
	other, _ := createSession(u.ID)

	if rec := authedRequest(t, u, token, "/api/me/password", updatePasswordReq{Current: "wrong-pass", Password: "password2"}, handleUpdatePassword); rec.Code != http.StatusBadRequest {
		t.Fatalf("wrong current: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if rec := authedRequest(t, u, token, "/api/me/password", updatePasswordReq{Current: "password1", Password: "short"}, handleUpdatePassword); rec.Code != http.StatusBadRequest {
		t.Fatalf("short: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if rec := authedRequest(t, u, token, "/api/me/password", updatePasswordReq{Current: "password1", Password: "password2"}, handleUpdatePassword); rec.Code != http.StatusOK {
		t.Fatalf("ok: status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var hash, salt string
	db.QueryRow(`SELECT password_hash, password_salt FROM users WHERE id = ?`, u.ID).Scan(&hash, &salt)
	if ok, _ := verifyUserPassword("password2", hash, salt); !ok {
		t.Fatal("new password not saved")
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE token = ?`, other).Scan(&count)
	if count != 0 {
		t.Fatal("other sessions must be revoked")
	}
	db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE token = ?`, token).Scan(&count)
	if count != 1 {
		t.Fatal("current session must stay")
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
