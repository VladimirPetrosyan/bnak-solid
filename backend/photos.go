package main

import (
	"database/sql"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxUploadSize = 12 << 20 // 12 МБ на файл

// saveUploadedFile сохраняет один файл из multipart-формы в uploadsDir/subdir
// и возвращает публичный URL вида /uploads/<subdir>/<имя>.
func saveUploadedFile(r *http.Request, field, subdir string) (string, error) {
	file, header, err := r.FormFile(field)
	if err != nil {
		return "", err
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".bin"
	}
	name := newID() + ext
	dir := filepath.Join(uploadsDir, subdir)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	dst, err := os.Create(filepath.Join(dir, name))
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, io.LimitReader(file, maxUploadSize)); err != nil {
		return "", err
	}
	return "/uploads/" + subdir + "/" + name, nil
}

// ---------- POST /api/listings/{id}/photos ----------

func handleUploadListingPhoto(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	if l.Status != "pending" {
		writeErr(w, http.StatusConflict, "changes_require_review")
		return
	}
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeErr(w, http.StatusBadRequest, "bad multipart form")
		return
	}
	url, err := saveUploadedFile(r, "photo", "listings/"+l.ID)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "no photo file (field 'photo')")
		return
	}
	if err := addListingPhoto(l, url, time.Now()); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"url": url})
}

func photoCountTx(tx *sql.Tx, listingID string) (int, error) {
	var count int
	err := tx.QueryRow(`SELECT COUNT(*) FROM listing_photos WHERE listing_id = ?`, listingID).Scan(&count)
	return count, err
}

func addListingPhoto(l *Listing, url string, now time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var pos int
	if err := tx.QueryRow(`SELECT COALESCE(MAX(position), -1) + 1 FROM listing_photos WHERE listing_id = ?`, l.ID).Scan(&pos); err != nil {
		return err
	}
	if _, err := tx.Exec(`INSERT INTO listing_photos(listing_id, url, position) VALUES (?, ?, ?)`, l.ID, url, pos); err != nil {
		return err
	}

	if l.Status == "active" {
		count, err := photoCountTx(tx, l.ID)
		if err != nil {
			return err
		}
		if count >= 5 {
			if _, err := grantTokens(tx, now, grantInput{
				userID: l.OwnerID, amount: rewardQualityPhotos, kind: kindQualityPhotos,
				eventKey: "quality_photos:" + l.ID, listingID: &l.ID, cap: monthlyRewardCap,
			}); err != nil {
				return err
			}
		}
	}

	return tx.Commit()
}

// ---------- DELETE /api/listings/{id}/photos ----------
// ?url=/uploads/listings/xxx/yyy.jpg

func handleDeleteListingPhoto(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	if l.Status != "pending" {
		writeErr(w, http.StatusConflict, "changes_require_review")
		return
	}
	url := r.URL.Query().Get("url")
	if url == "" {
		writeErr(w, http.StatusBadRequest, "missing url")
		return
	}
	db.Exec(`DELETE FROM listing_photos WHERE listing_id = ? AND url = ?`, l.ID, url)
	os.Remove(filepath.Join(".", url))
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- POST /api/uploads ----------
// Универсальная загрузка для вложений чата (фото, видео, документы). Поле формы: "file".

func handleGenericUpload(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		writeErr(w, http.StatusBadRequest, "bad multipart form")
		return
	}
	_, header, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "no file (field 'file')")
		return
	}
	url, err := saveUploadedFile(r, "file", "chat")
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "save failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"url": url, "name": header.Filename, "size": header.Size})
}
