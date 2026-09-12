package main

import (
	"crypto/rand"
	"encoding/json"
	"log"
	"math/big"
	"net/http"

	"github.com/google/uuid"
)

// newID — короткий уникальный идентификатор для записей (объявления, треды, сессии).
func newID() string {
	return uuid.NewString()
}

// newCode — 4-значный код подтверждения (как в демо-фронтенде).
func newCode() string {
	n, err := rand.Int(rand.Reader, big.NewInt(10000))
	if err != nil {
		return "1111"
	}
	return padLeft4(n.Int64())
}

func padLeft4(n int64) string {
	s := ""
	for i := 0; i < 4; i++ {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}

// newToken — токен сессии.
func newToken() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return uuid.NewString() + uuid.NewString()
	}
	const hex = "0123456789abcdef"
	out := make([]byte, len(b)*2)
	for i, c := range b {
		out[i*2] = hex[c>>4]
		out[i*2+1] = hex[c&0x0f]
	}
	return string(out)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Println("writeJSON:", err)
	}
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func readJSON(r *http.Request, v any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func logf(format string, args ...any) {
	log.Printf(format, args...)
}
