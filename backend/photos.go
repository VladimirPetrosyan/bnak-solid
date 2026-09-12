package main

import (
	"database/sql"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const maxUploadSize = 12 << 20 // 12 МБ на файл

var errUploadBadType = errors.New("upload type not allowed")

var allowedImageUploadMIME = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
	"image/gif":  ".gif",
}

var allowedChatUploadMIME = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"image/gif":       ".gif",
	"video/mp4":       ".mp4",
	"video/webm":      ".webm",
	"video/quicktime": ".mov",
}

// saveUploadedFile сохраняет один файл из multipart-формы в uploadsDir/subdir и
// возвращает публичный URL вида /uploads/<subdir>/<имя>. Тип файла определяется
// по содержимому (не по расширению/заголовку клиента) и сверяется с allowed —
// иначе загруженный файл мог бы отдаться браузеру как HTML/SVG того же origin.
func saveUploadedFile(r *http.Request, field, subdir string, allowed map[string]string) (string, error) {
	file, _, err := r.FormFile(field)
	if err != nil {
		return "", err
	}
	defer file.Close()

	sniff := make([]byte, 512)
	n, err := io.ReadFull(file, sniff)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return "", err
	}
	sniff = sniff[:n]

	mimeType := strings.SplitN(http.DetectContentType(sniff), ";", 2)[0]
	ext, ok := allowed[mimeType]
	if !ok {
		return "", errUploadBadType
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

	if _, err := dst.Write(sniff); err != nil {
		os.Remove(filepath.Join(dir, name))
		return "", err
	}
	if _, err := io.Copy(dst, io.LimitReader(file, maxUploadSize)); err != nil {
		os.Remove(filepath.Join(dir, name))
		return "", err
	}
	return "/uploads/" + subdir + "/" + name, nil
}

// removeUploadedFile удаляет файл, ранее сохранённый saveUploadedFile, по его
// публичному URL. Путь всегда проверяется на принадлежность uploadsDir, чтобы
// значение из клиентского запроса не могло удалить файл за пределами каталога.
func removeUploadedFile(publicURL string) {
	rel := strings.TrimPrefix(publicURL, "/uploads/")
	if rel == publicURL || rel == "" {
		return
	}
	root, err := filepath.Abs(uploadsDir)
	if err != nil {
		return
	}
	full, err := filepath.Abs(filepath.Join(root, rel))
	if err != nil || (full != root && !strings.HasPrefix(full, root+string(filepath.Separator))) {
		return
	}
	if err := os.Remove(full); err != nil && !os.IsNotExist(err) {
		logf("delete uploaded file %s: %v", full, err)
	}
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
	url, err := saveUploadedFile(r, "photo", "listings/"+l.ID, allowedImageUploadMIME)
	if err != nil {
		if errors.Is(err, errUploadBadType) {
			writeErr(w, http.StatusBadRequest, "unsupported image type")
			return
		}
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
	res, err := db.Exec(`DELETE FROM listing_photos WHERE listing_id = ? AND url = ?`, l.ID, url)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	// Файл трогаем только если строка реально принадлежала этому объявлению —
	// иначе произвольный url в query мог бы указать на файл вне каталога.
	if n, _ := res.RowsAffected(); n > 0 {
		removeUploadedFile(url)
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- POST /api/uploads ----------
// Универсальная загрузка для вложений чата (фото, видео). Поле формы: "file".

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
	url, err := saveUploadedFile(r, "file", "chat", allowedChatUploadMIME)
	if err != nil {
		if errors.Is(err, errUploadBadType) {
			writeErr(w, http.StatusBadRequest, "unsupported file type")
			return
		}
		writeErr(w, http.StatusInternalServerError, "save failed")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"url": url, "name": header.Filename, "size": header.Size})
}
