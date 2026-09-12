package main

import (
	"context"
	"crypto/subtle"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const ctxUserKey ctxKey = "user"

// currentLegalVersion — версия пакета «пользовательское соглашение + политика
// конфиденциальности + обработка персональных данных», под которым регистрируется
// согласие. Должна совпадать с LEGAL_CONSENT_VERSION в src/legalDocs.js: при правке
// текста любого из этих трёх документов обновите обе константы вместе.
const currentLegalVersion = "2026-08-25"

var legalLanguages = map[string]bool{"hy": true, "ru": true, "en": true}

// normalizeLegalLanguage приводит язык к нижнему регистру и проверяет по allowlist —
// доверять клиенту тут нечего, значение только hy/ru/en.
func normalizeLegalLanguage(raw string) (string, bool) {
	v := strings.ToLower(strings.TrimSpace(raw))
	if !legalLanguages[v] {
		return "", false
	}
	return v, true
}

// Вход по номеру телефона устроен так:
//   1) POST /api/auth/start        — по номеру определяем, новый он или уже зарегистрирован.
//      Для нового номера тут же отправляется SMS-код; для уже зарегистрированного — ничего
//      отправлять не нужно, дальше просто вводится пароль.
//   2) новый номер: POST /api/auth/verify-code — код из SMS подтверждён, окно 10 минут открыто
//      под шаг «придумать пароль» (регистрация) без повторного ввода кода.
//   3) новый номер: POST /api/auth/register — пароль (не короче 8 символов) + имя/роль → аккаунт
//      и сессия создаются одним шагом.
//   4) уже зарегистрированный номер: POST /api/auth/login — телефон + пароль → сессия.
//   5) «забыли пароль»: тот же /api/auth/request-code + /api/auth/verify-code, затем
//      POST /api/auth/reset-password — новый пароль для существующего аккаунта.

// ---------- шаг 1: узнать, зарегистрирован ли номер ----------

type startReq struct {
	Phone string `json:"phone"`
}

func handleAuthStart(w http.ResponseWriter, r *http.Request) {
	var req startReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	phone := normalizePhone(req.Phone)
	if !validPhone(phone) {
		writeErr(w, http.StatusBadRequest, "invalid phone")
		return
	}
	var one int
	err := db.QueryRow(`SELECT 1 FROM users WHERE phone = ?`, phone).Scan(&one)
	if err == nil {
		writeJSON(w, http.StatusOK, map[string]any{"exists": true})
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	// новый номер — сразу отправляем код подтверждения
	resp, err := sendCode(phone)
	if err != nil {
		writeSendCodeErr(w, err)
		return
	}
	resp["exists"] = false
	writeJSON(w, http.StatusOK, resp)
}

// ---------- запрос кода (повторная отправка / «забыли пароль» для существующего номера) ----------

type requestCodeReq struct {
	Phone string `json:"phone"`
}

// handleRequestCode генерирует одноразовый код и отправляет его через Notificore
// (см. notificore.go), если задан NOTIFICORE_API_KEY. Пока ключ не настроен, поведение
// прежнее: код пишется в лог сервера и (только при DEV_MODE=1) возвращается в ответе как
// devCode, чтобы фронтенд мог работать end-to-end без SMS.
func handleRequestCode(w http.ResponseWriter, r *http.Request) {
	var req requestCodeReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	phone := normalizePhone(req.Phone)
	if !validPhone(phone) {
		writeErr(w, http.StatusBadRequest, "invalid phone")
		return
	}
	resp, err := sendCode(phone)
	if err != nil {
		writeSendCodeErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

// otpResendCooldown — минимальный интервал между двумя отправками кода на один номер,
// не даёт заспамить пользователя SMS (и не сжигает баланс Notificore) через повторные
// запросы к /api/auth/start или /api/auth/request-code.
const otpResendCooldown = 60 * time.Second

// otpCooldownError — код ещё нельзя переслать, retryAfter показывает, сколько ждать.
type otpCooldownError struct{ retryAfter time.Duration }

func (e *otpCooldownError) Error() string { return "otp: resend cooldown active" }

// writeSendCodeErr превращает ошибку sendCode в HTTP-ответ: 429 с retryAfter в секундах
// для срабатывания троттлинга, 500 — для остальных сбоев (БД, отправка SMS).
func writeSendCodeErr(w http.ResponseWriter, err error) {
	var cooldown *otpCooldownError
	if errors.As(err, &cooldown) {
		retryAfter := int(cooldown.retryAfter.Round(time.Second) / time.Second)
		if retryAfter < 1 {
			retryAfter = 1
		}
		writeJSON(w, http.StatusTooManyRequests, map[string]any{"error": "too many requests", "retryAfter": retryAfter})
		return
	}
	writeErr(w, http.StatusInternalServerError, "sms send failed")
}

func sendCode(phone string) (map[string]any, error) {
	var lastRequested sql.NullTime
	err := db.QueryRow(`SELECT requested_at FROM otp_codes WHERE phone = ?`, phone).Scan(&lastRequested)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		log.Println("request-code:", err)
		return nil, err
	}
	if lastRequested.Valid {
		if wait := otpResendCooldown - time.Since(lastRequested.Time); wait > 0 {
			return nil, &otpCooldownError{retryAfter: wait}
		}
	}

	code := newCode()
	if devMode {
		code = "1111" // в деве код всегда одинаковый — удобно для ручного тестирования
	}
	now := time.Now()
	_, err = db.Exec(`INSERT INTO otp_codes(phone, code, verified, expires_at, requested_at, attempts) VALUES (?, ?, 0, ?, ?, 0)
		ON CONFLICT(phone) DO UPDATE SET code=excluded.code, verified=0, expires_at=excluded.expires_at, requested_at=excluded.requested_at, attempts=0`,
		phone, code, now.Add(5*time.Minute), now)
	if err != nil {
		log.Println("request-code:", err)
		return nil, err
	}

	if notificoreAPIKey == "" {
		log.Printf("[OTP] %s -> %s", phone, code)
		resp := map[string]any{"sent": true}
		if devMode {
			resp["devCode"] = code
		}
		return resp, nil
	}

	text := fmt.Sprintf("HayHome: %s — verification code", code)
	if err := sendNotificoreSMS(phone, text, newID()); err != nil {
		log.Println("notificore send:", err)
		return nil, err
	}
	return map[string]any{"sent": true}, nil
}

// ---------- шаг 2: подтвердить код из SMS (без создания пользователя/сессии) ----------

type verifyCodeReq struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// otpMaxAttempts — сколько раз подряд можно ошибиться с кодом, прежде чем его нужно
// запросить заново (attempts сбрасывается при новой отправке, см. sendCode). Без этого
// лимита 4-значный код (10000 вариантов) можно перебрать простым скриптом.
const otpMaxAttempts = 5

func handleVerifyCode(w http.ResponseWriter, r *http.Request) {
	var req verifyCodeReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	phone := normalizePhone(req.Phone)

	var storedCode string
	var expiresAt time.Time
	var attempts int
	err := db.QueryRow(`SELECT code, expires_at, attempts FROM otp_codes WHERE phone = ?`, phone).
		Scan(&storedCode, &expiresAt, &attempts)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusBadRequest, "code not requested")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if time.Now().After(expiresAt) {
		writeErr(w, http.StatusBadRequest, "code expired")
		return
	}
	if attempts >= otpMaxAttempts {
		writeErr(w, http.StatusTooManyRequests, "too many attempts, request a new code")
		return
	}
	if subtle.ConstantTimeCompare([]byte(req.Code), []byte(storedCode)) != 1 {
		db.Exec(`UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?`, phone)
		writeErr(w, http.StatusBadRequest, "wrong code")
		return
	}
	// код верный — помечаем подтверждённым и продлеваем окно на время придумывания пароля
	if _, err := db.Exec(`UPDATE otp_codes SET verified = 1, expires_at = ?, attempts = 0 WHERE phone = ?`,
		time.Now().Add(10*time.Minute), phone); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// phoneVerified проверяет, что для этого номера недавно подтверждён код (шаг 2 выше),
// и если да — удаляет отметку, чтобы её нельзя было использовать повторно.
func phoneVerified(phone string) bool {
	var verified bool
	var expiresAt time.Time
	err := db.QueryRow(`SELECT verified, expires_at FROM otp_codes WHERE phone = ?`, phone).Scan(&verified, &expiresAt)
	if err != nil || !verified || time.Now().After(expiresAt) {
		return false
	}
	return true
}

// ---------- шаг 3: регистрация нового номера — пароль + имя/роль → аккаунт + сессия ----------

type registerReq struct {
	Phone         string `json:"phone"`
	Password      string `json:"password"`
	Name          string `json:"name"`
	Role          string `json:"role"`
	AcceptedLegal bool   `json:"acceptedLegal"`
	LegalVersion  string `json:"legalVersion"`
	LegalLanguage string `json:"legalLanguage"`
}

// пароль — не короче 8 символов (верхнюю границу намеренно не ставим).
func validPassword(p string) bool {
	return len([]rune(p)) >= 8
}

var errPhoneTaken = errors.New("phone_taken")

// Пароли пользователей хешируются bcrypt (в отличие от админки, где для внутреннего
// однопользовательского инструмента достаточно salt+SHA-256, см. admin_auth.go) —
// это реальные учётные записи с номерами телефонов, и при утечке базы такой хеш
// на порядки дороже перебирать. password_salt для новых записей не используется
// (bcrypt хранит соль внутри самого хеша), но остаётся в схеме ради старых записей —
// verifyUserPassword ниже понимает оба формата и незаметно переводит логин на bcrypt.

// newUserPasswordHash хеширует пароль bcrypt для сохранения в users.password_hash.
func newUserPasswordHash(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

func isBcryptHash(hash string) bool {
	return strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") || strings.HasPrefix(hash, "$2y$")
}

// verifyUserPassword сверяет пароль с сохранённым хешем. legacy=true означает, что
// хеш ещё в старом формате (salt+SHA-256) и его стоит перевести на bcrypt прямо
// сейчас, пока пароль в открытом виде всё равно есть под рукой.
func verifyUserPassword(password, hash, salt string) (ok bool, legacy bool) {
	if hash == "" {
		return false, false
	}
	if isBcryptHash(hash) {
		return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil, false
	}
	got := hashPassword(password, salt)
	return subtle.ConstantTimeCompare([]byte(got), []byte(hash)) == 1, true
}

func registerUser(phone, password, name, role, legalLanguage string, now time.Time) (*User, string, error) {
	trimmedName := strings.TrimSpace(name)
	profileComplete := trimmedName != "" && (role == "owner" || role == "agency" || role == "tenant")

	finalRole := role
	if finalRole != "owner" && finalRole != "agency" {
		finalRole = "tenant"
	}
	finalName := trimmedName
	if finalName == "" {
		finalName = "HayHome"
	}
	ini := initialsOf(finalName)
	hash, err := newUserPasswordHash(password)
	if err != nil {
		return nil, "", err
	}
	id := newID()

	tx, err := db.Begin()
	if err != nil {
		return nil, "", err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`INSERT INTO users(id, phone, name, role, ini, password_hash, password_salt, legal_version, legal_accepted_at, legal_language)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, phone, finalName, finalRole, ini, hash, "", currentLegalVersion, now, legalLanguage); err != nil {
		return nil, "", errPhoneTaken
	}
	tx.Exec(`DELETE FROM otp_codes WHERE phone = ?`, phone)

	token := newToken()
	if _, err := tx.Exec(`INSERT INTO sessions(token, user_id, expires_at) VALUES (?, ?, ?)`,
		token, id, now.Add(30*24*time.Hour)); err != nil {
		return nil, "", err
	}

	if _, err := grantTokens(tx, now, grantInput{userID: id, amount: rewardSignup, kind: kindSignup, eventKey: "signup:" + id}); err != nil {
		return nil, "", err
	}
	if profileComplete {
		if _, err := grantTokens(tx, now, grantInput{userID: id, amount: rewardProfile, kind: kindProfileComplete, eventKey: "profile_complete:" + id}); err != nil {
			return nil, "", err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, "", err
	}
	return &User{
		ID: id, Phone: phone, Name: finalName, Role: finalRole, Ini: ini, CreatedAt: now,
		LegalVersion: currentLegalVersion, LegalAcceptedAt: &now, LegalLanguage: legalLanguage,
	}, token, nil
}

func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	phone := normalizePhone(req.Phone)
	if !validPassword(req.Password) {
		writeErr(w, http.StatusBadRequest, "invalid password")
		return
	}
	if !phoneVerified(phone) {
		writeErr(w, http.StatusBadRequest, "phone not verified")
		return
	}
	if !req.AcceptedLegal {
		writeErr(w, http.StatusBadRequest, "legal not accepted")
		return
	}
	if req.LegalVersion != currentLegalVersion {
		writeErr(w, http.StatusBadRequest, "legal version outdated")
		return
	}
	legalLanguage, ok := normalizeLegalLanguage(req.LegalLanguage)
	if !ok {
		writeErr(w, http.StatusBadRequest, "invalid legal language")
		return
	}

	user, token, err := registerUser(phone, req.Password, req.Name, req.Role, legalLanguage, time.Now())
	switch {
	case errors.Is(err, errPhoneTaken):
		writeErr(w, http.StatusBadRequest, "phone already registered")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user, "isNew": true})
	}
}

// ---------- вход по телефону + паролю ----------

type loginReq struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	phone := normalizePhone(req.Phone)

	u := &User{}
	var legalAcceptedAt sql.NullTime
	err := db.QueryRow(`SELECT id, phone, name, role, status, ini, created_at, password_hash, password_salt, legal_version, legal_accepted_at, legal_language
		FROM users WHERE phone = ?`, phone).
		Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Status, &u.Ini, &u.CreatedAt, &u.PasswordHash, &u.PasswordSalt, &u.LegalVersion, &legalAcceptedAt, &u.LegalLanguage)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if legalAcceptedAt.Valid {
		t := legalAcceptedAt.Time
		u.LegalAcceptedAt = &t
	}
	ok, legacy := verifyUserPassword(req.Password, u.PasswordHash, u.PasswordSalt)
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if u.Status == "blocked" {
		writeErr(w, http.StatusForbidden, "account blocked")
		return
	}
	if legacy {
		if newHash, err := newUserPasswordHash(req.Password); err == nil {
			db.Exec(`UPDATE users SET password_hash=?, password_salt='' WHERE id=?`, newHash, u.ID)
		}
	}
	token, err := createSession(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": u, "isNew": false})
}

// ---------- сброс пароля («забыли пароль») — по коду из SMS, для уже существующего номера ----------

type resetPasswordReq struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

func handleResetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordReq
	if err := readJSON(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	phone := normalizePhone(req.Phone)
	if !validPassword(req.Password) {
		writeErr(w, http.StatusBadRequest, "invalid password")
		return
	}
	if !phoneVerified(phone) {
		writeErr(w, http.StatusBadRequest, "phone not verified")
		return
	}

	u := &User{}
	var legalAcceptedAt sql.NullTime
	err := db.QueryRow(`SELECT id, phone, name, role, ini, created_at, legal_version, legal_accepted_at, legal_language FROM users WHERE phone = ?`, phone).
		Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Ini, &u.CreatedAt, &u.LegalVersion, &legalAcceptedAt, &u.LegalLanguage)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusBadRequest, "user not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if legalAcceptedAt.Valid {
		t := legalAcceptedAt.Time
		u.LegalAcceptedAt = &t
	}
	hash, err := newUserPasswordHash(req.Password)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := db.Exec(`UPDATE users SET password_hash=?, password_salt='' WHERE id=?`, hash, u.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	db.Exec(`DELETE FROM otp_codes WHERE phone = ?`, phone)

	token, err := createSession(u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": u, "isNew": false})
}

func createSession(userID string) (string, error) {
	token := newToken()
	_, err := db.Exec(`INSERT INTO sessions(token, user_id, expires_at) VALUES (?, ?, ?)`,
		token, userID, time.Now().Add(30*24*time.Hour))
	return token, err
}

// findOrCreateUser — используется только сидом демо-данных (seed.go), которому нужны
// готовые пользователи-владельцы без реального флоу телефон+пароль. Обычный вход через
// эти аккаунты паролем невозможен (password_hash у них пустой — handleLogin такое отвергает).
func findOrCreateUser(phone, name, role string) (*User, bool, error) {
	u := &User{}
	var legalAcceptedAt sql.NullTime
	err := db.QueryRow(`SELECT id, phone, name, role, ini, created_at, legal_version, legal_accepted_at, legal_language FROM users WHERE phone = ?`, phone).
		Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Ini, &u.CreatedAt, &u.LegalVersion, &legalAcceptedAt, &u.LegalLanguage)
	if err == nil {
		if legalAcceptedAt.Valid {
			t := legalAcceptedAt.Time
			u.LegalAcceptedAt = &t
		}
		return u, false, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, false, err
	}
	if role != "owner" && role != "agency" {
		role = "tenant"
	}
	if strings.TrimSpace(name) == "" {
		name = "HayHome"
	}
	ini := initialsOf(name)
	id := newID()
	_, err = db.Exec(`INSERT INTO users(id, phone, name, role, ini) VALUES (?, ?, ?, ?, ?)`,
		id, phone, name, role, ini)
	if err != nil {
		return nil, false, err
	}
	return &User{ID: id, Phone: phone, Name: name, Role: role, Ini: ini, CreatedAt: time.Now()}, true, nil
}

// ---------- PUT /api/me ----------
// Обновление профиля (имя/роль) — тот же эндпоинт использует переключатель роли в Profile.jsx.

type updateMeReq struct {
	Name string `json:"name"`
	Role string `json:"role"`
}

func handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	var in updateMeReq
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if in.Role != "owner" && in.Role != "agency" && in.Role != "tenant" {
		in.Role = u.Role
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = u.Name
	}
	ini := initialsOf(name)

	tx, err := db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE users SET name=?, role=?, ini=? WHERE id=?`, name, in.Role, ini, u.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if name != "" && (in.Role == "owner" || in.Role == "agency" || in.Role == "tenant") {
		if _, err := grantTokens(tx, time.Now(), grantInput{userID: u.ID, amount: rewardProfile, kind: kindProfileComplete, eventKey: "profile_complete:" + u.ID}); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"name": name, "role": in.Role, "ini": ini})
}

func initialsOf(name string) string {
	parts := strings.Fields(name)
	out := ""
	for i, p := range parts {
		if i >= 2 {
			break
		}
		out += strings.ToUpper(string([]rune(p)[0]))
	}
	if out == "" {
		return "ME"
	}
	return out
}

func normalizePhone(p string) string {
	var b strings.Builder
	for _, r := range p {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// Точную длину номера по каждой стране проверяет фронтенд (см. COUNTRIES в
// src/countries.js, там же маска и код страны для ~100 стран). Здесь — только грубая
// защита на случай прямых запросов к API в обход формы: полный номер с кодом страны по
// стандарту E.164 всегда укладывается в 8-15 цифр.
func validPhone(phone string) bool {
	return len(phone) >= 8 && len(phone) <= 15
}

// ---------- сессия / middleware ----------

func handleLogout(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r)
	if token != "" {
		db.Exec(`DELETE FROM sessions WHERE token = ?`, token)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func handleMe(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	if u == nil {
		writeErr(w, http.StatusUnauthorized, "not authenticated")
		return
	}
	writeJSON(w, http.StatusOK, u)
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if strings.HasPrefix(h, "Bearer ") {
		return strings.TrimPrefix(h, "Bearer ")
	}
	return ""
}

func userFromCtx(ctx context.Context) *User {
	u, _ := ctx.Value(ctxUserKey).(*User)
	return u
}

// withUser подгружает пользователя по токену, если он есть, но не требует его —
// удобно для эндпоинтов вроде списка объявлений, где авторизация опциональна.
func withUser(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		if token == "" {
			next(w, r)
			return
		}
		var u User
		var expiresAt time.Time
		var legalAcceptedAt sql.NullTime
		err := db.QueryRow(`SELECT u.id, u.phone, u.name, u.role, u.ini, u.created_at, u.legal_version, u.legal_accepted_at, u.legal_language, s.expires_at
			FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?`, token).
			Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Ini, &u.CreatedAt, &u.LegalVersion, &legalAcceptedAt, &u.LegalLanguage, &expiresAt)
		if err == nil && time.Now().Before(expiresAt) {
			if legalAcceptedAt.Valid {
				t := legalAcceptedAt.Time
				u.LegalAcceptedAt = &t
			}
			ctx := context.WithValue(r.Context(), ctxUserKey, &u)
			r = r.WithContext(ctx)
		}
		next(w, r)
	}
}

// requireAuth — как withUser, но обрывает запрос 401, если пользователь не найден.
func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request) {
		if userFromCtx(r.Context()) == nil {
			writeErr(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		next(w, r)
	})
}
