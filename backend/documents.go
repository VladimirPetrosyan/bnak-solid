package main

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

const (
	maxRequestBytes  = 12 << 20 // общий лимит тела запроса POST /api/listings
	maxDocumentBytes = 10 << 20 // лимит на сам файл документа
)

var allowedDocumentMIME = map[string]string{
	"application/pdf": ".pdf",
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
}

var (
	errDocMissing  = errors.New("document missing")
	errDocEmpty    = errors.New("document is empty")
	errDocTooLarge = errors.New("document too large")
	errDocBadType  = errors.New("document type not allowed")
)

type uploadedDocument struct {
	originalName string
	storedName   string
	path         string
	mimeType     string
	size         int64
	sha256       string
}

func sanitizeOriginalName(name string) string {
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	var b strings.Builder
	for _, r := range name {
		if r < 0x20 || r == 0x7f {
			continue
		}
		b.WriteRune(r)
	}
	out := strings.TrimSpace(b.String())
	if out == "" || out == "." || out == ".." {
		out = "document"
	}
	const maxLen = 180
	if runes := []rune(out); len(runes) > maxLen {
		out = string(runes[:maxLen])
	}
	return out
}

type capWriter struct {
	w   io.Writer
	n   int64
	max int64
}

func (c *capWriter) Write(p []byte) (int, error) {
	if c.n+int64(len(p)) > c.max {
		return 0, errDocTooLarge
	}
	n, err := c.w.Write(p)
	c.n += int64(n)
	return n, err
}

func saveDocument(r *http.Request, field string) (*uploadedDocument, error) {
	file, header, err := r.FormFile(field)
	if err != nil {
		return nil, errDocMissing
	}
	defer file.Close()

	sniff := make([]byte, 512)
	n, err := io.ReadFull(file, sniff)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return nil, err
	}
	sniff = sniff[:n]
	if n == 0 {
		return nil, errDocEmpty
	}

	mimeType := strings.SplitN(http.DetectContentType(sniff), ";", 2)[0]
	ext, ok := allowedDocumentMIME[mimeType]
	if !ok {
		return nil, errDocBadType
	}

	storedName := newID() + ext
	dstPath := filepath.Join(privateDocumentsDir, storedName)
	dst, err := os.OpenFile(dstPath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return nil, err
	}

	hasher := sha256.New()
	cw := &capWriter{w: io.MultiWriter(dst, hasher), max: maxDocumentBytes}

	if _, err := cw.Write(sniff); err != nil {
		dst.Close()
		os.Remove(dstPath)
		return nil, err
	}
	rest, err := io.Copy(cw, file)
	if err != nil {
		dst.Close()
		os.Remove(dstPath)
		return nil, err
	}
	if err := dst.Close(); err != nil {
		os.Remove(dstPath)
		return nil, err
	}

	return &uploadedDocument{
		originalName: sanitizeOriginalName(header.Filename),
		storedName:   storedName,
		path:         dstPath,
		mimeType:     mimeType,
		size:         int64(n) + rest,
		sha256:       hex.EncodeToString(hasher.Sum(nil)),
	}, nil
}

func writeDocumentErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errDocMissing):
		writeErr(w, http.StatusBadRequest, "document missing")
	case errors.Is(err, errDocEmpty):
		writeErr(w, http.StatusBadRequest, "document is empty")
	case errors.Is(err, errDocTooLarge):
		writeErr(w, http.StatusRequestEntityTooLarge, "document too large")
	case errors.Is(err, errDocBadType):
		writeErr(w, http.StatusBadRequest, "document type not allowed")
	default:
		writeErr(w, http.StatusInternalServerError, "db error")
	}
}

type listingDocument struct {
	id           string
	listingID    string
	originalName string
	storedName   string
	mimeType     string
	size         int64
	sha256       string
	status       string
	createdAt    time.Time
}

func loadListingDocument(listingID string) (*listingDocument, error) {
	var d listingDocument
	err := db.QueryRow(`SELECT id, listing_id, original_name, stored_name, mime_type, size, sha256, status, created_at
		FROM listing_documents WHERE listing_id = ?`, listingID).
		Scan(&d.id, &d.listingID, &d.originalName, &d.storedName, &d.mimeType, &d.size, &d.sha256, &d.status, &d.createdAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

// ---------- GET /api/listings/{id}/document (владелец) ----------

func handleGetListingDocument(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	doc, err := loadListingDocument(l.ID)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"id": doc.id, "originalName": doc.originalName, "mimeType": doc.mimeType,
		"size": doc.size, "status": doc.status, "createdAt": doc.createdAt,
	})
}

// ---------- GET /api/admin/listings/{id}/document ----------

func handleAdminGetListingDocument(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	doc, err := loadListingDocument(id)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	path := filepath.Join(privateDocumentsDir, filepath.Base(doc.storedName))
	f, err := os.Open(path)
	if err != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	w.Header().Set("Content-Type", doc.mimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(info.Size(), 10))
	w.Header().Set("Content-Disposition", mime.FormatMediaType("inline", map[string]string{"filename": doc.originalName}))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, no-store")
	if err := copyDocumentBody(w, f); err != nil {
		logf("admin document download copy failed for listing %s: %v", id, err)
	}
}

func copyDocumentBody(w io.Writer, r io.Reader) error {
	_, err := io.Copy(w, r)
	return err
}

func deleteListingAndDocument(id string) error {
	doc, err := loadListingDocument(id)
	hasDoc := true
	if errors.Is(err, sql.ErrNoRows) {
		hasDoc = false
	} else if err != nil {
		return err
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`DELETE FROM listings WHERE id = ?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return errListingNotFound
	}
	if err := tx.Commit(); err != nil {
		return err
	}

	if hasDoc {
		path := filepath.Join(privateDocumentsDir, filepath.Base(doc.storedName))
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			logf("delete listing document file %s: %v", doc.storedName, err)
		}
	}
	return nil
}
