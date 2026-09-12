package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"errors"
	"net/http"
	"time"
)

// Аутентификация панели администратора — полностью отдельная от обычных пользователей
// система: свои таблицы (admins/admin_sessions), свой логин/пароль, свои токены сессии.
// Токен обычного пользователя (`sessions`) здесь не подходит ни при каких условиях, и
// наоборот — эти эндпоинты физически не пересекаются с requireAuth/withUser из auth.go.

type ctxAdminKey string

const ctxAdminCtxKey ctxAdminKey = "admin"

// hashPassword — соль + SHA-256. Для внутреннего инструмента одного оператора этого
// достаточно; для настоящего multi-tenant продакшна замените на bcrypt/argon2id.
func hashPassword(password, salt string) string {
	sum := sha256.Sum256([]byte(salt + ":" + password))
	return hex.EncodeToString(sum[:])
}

func newSalt() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// ensureBootstrapAdmin создаёт первого супер-пользователя из ADMIN_USERNAME/ADMIN_PASSWORD,
// но только если таблица admins ещё совсем пуста — так параметры окружения нельзя
// использовать, чтобы захватить уже настроенную панель. Дальше логин/пароль меняются
// только напрямую в базе (это внутренний инструмент, без самостоятельной регистрации).
func ensureBootstrapAdmin(username, password string) {
	if username == "" || password == "" {
		return
	}
	var n int
	db.QueryRow(`SELECT COUNT(*) FROM admins`).Scan(&n)
	if n > 0 {
		return
	}
	salt := newSalt()
	hash := hashPassword(password, salt)
	if _, err := db.Exec(`INSERT INTO admins(id, username, password_hash, password_salt) VALUES (?, ?, ?, ?)`,
		newID(), username, hash, salt); err != nil {
		logf("ensureBootstrapAdmin: %v", err)
		return
	}
	logf("создан супер-пользователь панели администратора: %s", username)
}

// ---------- POST /api/admin/login ----------

type adminLoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func handleAdminLogin(w http.ResponseWriter, r *http.Request) {
	var in adminLoginInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	var id, hash, salt string
	err := db.QueryRow(`SELECT id, password_hash, password_salt FROM admins WHERE username = ?`, in.Username).
		Scan(&id, &hash, &salt)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	got := hashPassword(in.Password, salt)
	if subtle.ConstantTimeCompare([]byte(got), []byte(hash)) != 1 {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token := newToken()
	if _, err := db.Exec(`INSERT INTO admin_sessions(token, admin_id, expires_at) VALUES (?, ?, ?)`,
		token, id, time.Now().Add(12*time.Hour)); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"token": token})
}

// ---------- POST /api/admin/logout ----------

func handleAdminLogout(w http.ResponseWriter, r *http.Request) {
	token := bearerToken(r)
	if token != "" {
		db.Exec(`DELETE FROM admin_sessions WHERE token = ?`, token)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func adminFromCtx(ctx context.Context) *Admin {
	a, _ := ctx.Value(ctxAdminCtxKey).(*Admin)
	return a
}

// requireAdminSession защищает все /api/admin/* эндпоинты, кроме самого /login.
func requireAdminSession(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		if token == "" {
			writeErr(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		var a Admin
		var expiresAt time.Time
		err := db.QueryRow(`SELECT a.id, a.username, s.expires_at
			FROM admin_sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token = ?`, token).
			Scan(&a.ID, &a.Username, &expiresAt)
		if err != nil || time.Now().After(expiresAt) {
			writeErr(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		ctx := context.WithValue(r.Context(), ctxAdminCtxKey, &a)
		next(w, r.WithContext(ctx))
	}
}
