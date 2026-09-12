package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func setupTestPrivateDocs(t *testing.T) {
	t.Helper()
	privateDocumentsDir = t.TempDir()
}

var (
	pdfBytes  = append([]byte("%PDF-1.4\n"), bytes.Repeat([]byte("x"), 100)...)
	jpegBytes = append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, bytes.Repeat([]byte{0}, 100)...)
	pngBytes  = append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n'}, bytes.Repeat([]byte{0}, 100)...)
	exeBytes  = append([]byte("MZ"), bytes.Repeat([]byte{0}, 100)...)
)

func multipartCreateListingBody(t *testing.T, listingJSON string, fileField, fileName string, fileContent []byte, includeFile bool) (*bytes.Buffer, string) {
	t.Helper()
	body := &bytes.Buffer{}
	mw := multipart.NewWriter(body)
	if err := mw.WriteField("listing", listingJSON); err != nil {
		t.Fatalf("write listing field: %v", err)
	}
	if includeFile {
		part, err := mw.CreateFormFile(fileField, fileName)
		if err != nil {
			t.Fatalf("create form file: %v", err)
		}
		if _, err := part.Write(fileContent); err != nil {
			t.Fatalf("write file content: %v", err)
		}
	}
	if err := mw.Close(); err != nil {
		t.Fatalf("close multipart writer: %v", err)
	}
	return body, mw.FormDataContentType()
}

func newCreateListingRequest(t *testing.T, listingJSON, fileName string, fileContent []byte) *http.Request {
	t.Helper()
	body, ct := multipartCreateListingBody(t, listingJSON, "document", fileName, fileContent, true)
	req := httptest.NewRequest(http.MethodPost, "/api/listings", body)
	req.Header.Set("Content-Type", ct)
	return req
}

func newCreateListingRequestNoDocument(t *testing.T, listingJSON string) *http.Request {
	t.Helper()
	body, ct := multipartCreateListingBody(t, listingJSON, "document", "", nil, false)
	req := httptest.NewRequest(http.MethodPost, "/api/listings", body)
	req.Header.Set("Content-Type", ct)
	return req
}

func validListingJSON() string {
	in := listingInput{Deal: "rent", City: "yerevan", Street: "Test str", Price: 100000, Area: 40, CadastreCode: "CAD-1", RepairCondition: "good"}
	b, _ := json.Marshal(in)
	return string(b)
}

func createListingAs(t *testing.T, ownerID string, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: ownerID, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleCreateListing(rec, req)
	return rec
}

func TestCreateListingValidDocumentTypes(t *testing.T) {
	cases := []struct {
		name     string
		fileName string
		content  []byte
		wantMime string
	}{
		{"pdf", "cert.pdf", pdfBytes, "application/pdf"},
		{"jpeg", "cert.jpg", jpegBytes, "image/jpeg"},
		{"png", "cert.png", pngBytes, "image/png"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			setupTestDB(t)
			setupTestPrivateDocs(t)
			owner := mustCreateUser(t, "tenant")

			req := newCreateListingRequest(t, validListingJSON(), c.fileName, c.content)
			rec := createListingAs(t, owner, req)
			if rec.Code != http.StatusCreated {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
			}
			var out struct {
				Listing Listing `json:"listing"`
			}
			if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
				t.Fatalf("decode: %v", err)
			}

			doc, err := loadListingDocument(out.Listing.ID)
			if err != nil {
				t.Fatalf("load document: %v", err)
			}
			if doc.mimeType != c.wantMime {
				t.Fatalf("mimeType = %q, want %q", doc.mimeType, c.wantMime)
			}
			if doc.originalName != c.fileName {
				t.Fatalf("originalName = %q, want %q", doc.originalName, c.fileName)
			}
			if doc.size != int64(len(c.content)) {
				t.Fatalf("size = %d, want %d", doc.size, len(c.content))
			}
			if doc.status != "pending" {
				t.Fatalf("status = %q, want pending", doc.status)
			}

			path := filepath.Join(privateDocumentsDir, doc.storedName)
			info, err := os.Stat(path)
			if err != nil {
				t.Fatalf("stat stored file: %v", err)
			}
			if runtime.GOOS != "windows" && info.Mode().Perm() != 0o600 {
				t.Fatalf("file perm = %v, want 0600", info.Mode().Perm())
			}
			stored, err := os.ReadFile(path)
			if err != nil {
				t.Fatalf("read stored file: %v", err)
			}
			if !bytes.Equal(stored, c.content) {
				t.Fatalf("stored content mismatch")
			}

			var count int
			db.QueryRow(`SELECT COUNT(*) FROM listing_documents WHERE listing_id = ?`, out.Listing.ID).Scan(&count)
			if count != 1 {
				t.Fatalf("want exactly 1 document row, got %d", count)
			}
		})
	}
}

func TestCreateListingRejectsMissingDocument(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	req := newCreateListingRequestNoDocument(t, validListingJSON())
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
	assertPrivateDirEmpty(t)
}

func TestCreateListingRejectsEmptyDocument(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	req := newCreateListingRequest(t, validListingJSON(), "empty.pdf", []byte{})
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "document is empty" {
		t.Fatalf("error = %q, want distinct 'document is empty' (not masked as missing/oversize)", body.Error)
	}
	assertNoListingsCreated(t)
	assertPrivateDirEmpty(t)
}

func TestCreateListingRejectsOversizeDocument(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	big := append([]byte("%PDF-1.4\n"), bytes.Repeat([]byte("x"), maxDocumentBytes)...)
	req := newCreateListingRequest(t, validListingJSON(), "big.pdf", big)
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
	assertPrivateDirEmpty(t)
}

func TestCreateListingRejectsExecutableRenamedToPdf(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	req := newCreateListingRequest(t, validListingJSON(), "invoice.pdf", exeBytes)
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "document type not allowed" {
		t.Fatalf("error = %q, want document type not allowed", body.Error)
	}
	assertNoListingsCreated(t)
	assertPrivateDirEmpty(t)
}

func TestCreateListingRejectsSpoofedMimeHeader(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	body := &bytes.Buffer{}
	mw := multipart.NewWriter(body)
	mw.WriteField("listing", validListingJSON())
	h := make(map[string][]string)
	h["Content-Disposition"] = []string{`form-data; name="document"; filename="cert.pdf"`}
	h["Content-Type"] = []string{"application/pdf"}
	part, err := mw.CreatePart(h)
	if err != nil {
		t.Fatalf("create part: %v", err)
	}
	part.Write(exeBytes)
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/listings", body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
}

func TestCreateListingMissingRequiredFields(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	in := listingInput{Deal: "rent", City: "yerevan"}
	b, _ := json.Marshal(in)
	req := newCreateListingRequest(t, string(b), "cert.pdf", pdfBytes)
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
	assertPrivateDirEmpty(t)
}

func TestCreateListingMissingRepairConditionRejected(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	in := listingInput{Deal: "rent", City: "yerevan", Street: "Test str", Price: 100000, Area: 40, CadastreCode: "CAD-1"}
	b, _ := json.Marshal(in)
	req := newCreateListingRequest(t, string(b), "cert.pdf", pdfBytes)
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
}

func TestCreateListingInvalidRepairConditionRejected(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	in := listingInput{
		Deal: "rent", City: "yerevan", Street: "Test str", Price: 100000, Area: 40,
		CadastreCode: "CAD-1", RepairCondition: "luxury",
	}
	b, _ := json.Marshal(in)
	req := newCreateListingRequest(t, string(b), "cert.pdf", pdfBytes)
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
}

func TestCreateListingRollbackRemovesFile(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	if _, err := db.Exec(`CREATE TRIGGER force_fail_listing_documents BEFORE INSERT ON listing_documents
		BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	req := newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAs(t, owner, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)
	assertPrivateDirEmpty(t)
}

func TestCreateListingDuplicateOriginalFilenameNoCollision(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	contentA := append([]byte("%PDF-1.4\n"), []byte("AAA")...)
	contentB := append([]byte("%PDF-1.4\n"), []byte("BBB")...)

	rec1 := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", contentA))
	rec2 := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", contentB))
	if rec1.Code != http.StatusCreated || rec2.Code != http.StatusCreated {
		t.Fatalf("unexpected status: %d / %d", rec1.Code, rec2.Code)
	}

	var out1, out2 struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec1.Body.Bytes(), &out1)
	json.Unmarshal(rec2.Body.Bytes(), &out2)

	doc1, err := loadListingDocument(out1.Listing.ID)
	if err != nil {
		t.Fatalf("load doc1: %v", err)
	}
	doc2, err := loadListingDocument(out2.Listing.ID)
	if err != nil {
		t.Fatalf("load doc2: %v", err)
	}
	if doc1.storedName == doc2.storedName {
		t.Fatalf("expected distinct stored names, got same: %s", doc1.storedName)
	}

	b1, _ := os.ReadFile(filepath.Join(privateDocumentsDir, doc1.storedName))
	b2, _ := os.ReadFile(filepath.Join(privateDocumentsDir, doc2.storedName))
	if bytes.Equal(b1, b2) {
		t.Fatalf("expected distinct content, files identical")
	}
}

func TestPublicListingResponsesHideDocumentInternals(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	db.Exec(`UPDATE listings SET status = 'active' WHERE id = ?`, out.Listing.ID)

	getReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+out.Listing.ID, nil)
	getReq.SetPathValue("id", out.Listing.ID)
	getRec := httptest.NewRecorder()
	handleGetListing(getRec, getReq)

	mineReq := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	mineReq = mineReq.WithContext(context.WithValue(mineReq.Context(), ctxUserKey, &User{ID: owner}))
	mineRec := httptest.NewRecorder()
	handleMyListings(mineRec, mineReq)

	for _, body := range []string{getRec.Body.String(), mineRec.Body.String()} {
		for _, leak := range []string{"storedName", "stored_name", "sha256", "\"path\""} {
			if bytes.Contains([]byte(body), []byte(leak)) {
				t.Fatalf("response leaks document internals (%q): %s", leak, body)
			}
		}
	}
}

func TestGetListingDocumentOwnerOnly(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")
	stranger := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)

	ownerReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+out.Listing.ID+"/document", nil)
	ownerReq.SetPathValue("id", out.Listing.ID)
	ownerReq = ownerReq.WithContext(context.WithValue(ownerReq.Context(), ctxUserKey, &User{ID: owner}))
	ownerRec := httptest.NewRecorder()
	handleGetListingDocument(ownerRec, ownerReq)
	if ownerRec.Code != http.StatusOK {
		t.Fatalf("owner status = %d, body = %s", ownerRec.Code, ownerRec.Body.String())
	}
	var meta map[string]any
	json.Unmarshal(ownerRec.Body.Bytes(), &meta)
	for _, leak := range []string{"path", "sha256", "storedName"} {
		if _, ok := meta[leak]; ok {
			t.Fatalf("owner metadata leaks %q: %v", leak, meta)
		}
	}
	for _, want := range []string{"id", "originalName", "mimeType", "size", "status", "createdAt"} {
		if _, ok := meta[want]; !ok {
			t.Fatalf("owner metadata missing %q: %v", want, meta)
		}
	}

	strangerReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+out.Listing.ID+"/document", nil)
	strangerReq.SetPathValue("id", out.Listing.ID)
	strangerReq = strangerReq.WithContext(context.WithValue(strangerReq.Context(), ctxUserKey, &User{ID: stranger}))
	strangerRec := httptest.NewRecorder()
	handleGetListingDocument(strangerRec, strangerReq)
	if strangerRec.Code != http.StatusForbidden {
		t.Fatalf("stranger status = %d, want 403", strangerRec.Code)
	}

	anonReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+out.Listing.ID+"/document", nil)
	anonReq.SetPathValue("id", out.Listing.ID)
	anonRec := httptest.NewRecorder()
	requireAuth(handleGetListingDocument)(anonRec, anonReq)
	if anonRec.Code != http.StatusUnauthorized {
		t.Fatalf("anonymous status = %d, want 401", anonRec.Code)
	}
}

func TestAdminGetListingDocumentDownload(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "тест кадастр.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/listings/"+out.Listing.ID+"/document", nil)
	req.SetPathValue("id", out.Listing.ID)
	dlRec := httptest.NewRecorder()
	handleAdminGetListingDocument(dlRec, req)

	if dlRec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", dlRec.Code, dlRec.Body.String())
	}
	if ct := dlRec.Header().Get("Content-Type"); ct != "application/pdf" {
		t.Fatalf("Content-Type = %q", ct)
	}
	if dlRec.Header().Get("Content-Disposition") == "" {
		t.Fatalf("missing Content-Disposition")
	}
	if dlRec.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatalf("missing X-Content-Type-Options: nosniff")
	}
	cc := dlRec.Header().Get("Cache-Control")
	if cc == "" {
		t.Fatalf("missing Cache-Control")
	}
	body, _ := io.ReadAll(dlRec.Body)
	if !bytes.Equal(body, pdfBytes) {
		t.Fatalf("downloaded content mismatch")
	}
}

func TestAdminGetListingDocumentNotFound(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "owner")
	listingNoDoc := mustCreateListing(t, owner, "active")

	for _, id := range []string{listingNoDoc, newID()} {
		req := httptest.NewRequest(http.MethodGet, "/api/admin/listings/"+id+"/document", nil)
		req.SetPathValue("id", id)
		rec := httptest.NewRecorder()
		handleAdminGetListingDocument(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("id=%s status = %d, want 404", id, rec.Code)
		}
	}
}

func TestDeleteListingRemovesDocumentFile(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	doc, err := loadListingDocument(out.Listing.ID)
	if err != nil {
		t.Fatalf("load doc: %v", err)
	}
	path := filepath.Join(privateDocumentsDir, doc.storedName)
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("file should exist before delete: %v", err)
	}

	delReq := httptest.NewRequest(http.MethodDelete, "/api/listings/"+out.Listing.ID, nil)
	delReq.SetPathValue("id", out.Listing.ID)
	delReq = delReq.WithContext(context.WithValue(delReq.Context(), ctxUserKey, &User{ID: owner}))
	delRec := httptest.NewRecorder()
	handleDeleteListing(delRec, delReq)
	if delRec.Code != http.StatusOK {
		t.Fatalf("delete status = %d, body = %s", delRec.Code, delRec.Body.String())
	}

	var listingCount, docCount int
	db.QueryRow(`SELECT COUNT(*) FROM listings WHERE id = ?`, out.Listing.ID).Scan(&listingCount)
	db.QueryRow(`SELECT COUNT(*) FROM listing_documents WHERE listing_id = ?`, out.Listing.ID).Scan(&docCount)
	if listingCount != 0 || docCount != 0 {
		t.Fatalf("want row cascade deleted, listing=%d document=%d", listingCount, docCount)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("want file removed, stat err = %v", err)
	}
}

func TestDeleteListingHandlesAlreadyMissingFileGracefully(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	doc, err := loadListingDocument(out.Listing.ID)
	if err != nil {
		t.Fatalf("load doc: %v", err)
	}
	os.Remove(filepath.Join(privateDocumentsDir, doc.storedName))

	delReq := httptest.NewRequest(http.MethodDelete, "/api/listings/"+out.Listing.ID, nil)
	delReq.SetPathValue("id", out.Listing.ID)
	delReq = delReq.WithContext(context.WithValue(delReq.Context(), ctxUserKey, &User{ID: owner}))
	delRec := httptest.NewRecorder()
	handleDeleteListing(delRec, delReq)
	if delRec.Code != http.StatusOK {
		t.Fatalf("delete status = %d, body = %s", delRec.Code, delRec.Body.String())
	}
	var listingCount int
	db.QueryRow(`SELECT COUNT(*) FROM listings WHERE id = ?`, out.Listing.ID).Scan(&listingCount)
	if listingCount != 0 {
		t.Fatalf("want listing row deleted despite missing file")
	}
}

func TestSanitizeOriginalName(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"cert.pdf", "cert.pdf"},
		{"../../etc/passwd", "passwd"},
		{`C:\Users\x\evil.pdf`, "evil.pdf"},
		{"a\x00\x1fb.pdf", "ab.pdf"},
		{"", "document"},
		{"..", "document"},
		{"кадастр справка.pdf", "кадастр справка.pdf"},
	}
	for _, c := range cases {
		got := sanitizeOriginalName(c.in)
		if got != c.want {
			t.Fatalf("sanitizeOriginalName(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

func TestSanitizeOriginalNameTruncatesLongNames(t *testing.T) {
	long := ""
	for i := 0; i < 500; i++ {
		long += "я"
	}
	got := sanitizeOriginalName(long + ".pdf")
	if n := len([]rune(got)); n > 180 {
		t.Fatalf("want truncated to <=180 runes, got %d", n)
	}
}

func TestDeleteListingDBFailurePreservesRowsAndFile(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	doc, err := loadListingDocument(out.Listing.ID)
	if err != nil {
		t.Fatalf("load doc: %v", err)
	}
	path := filepath.Join(privateDocumentsDir, doc.storedName)

	if _, err := db.Exec(`CREATE TRIGGER force_fail_listing_delete BEFORE DELETE ON listings
		BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	delReq := httptest.NewRequest(http.MethodDelete, "/api/listings/"+out.Listing.ID, nil)
	delReq.SetPathValue("id", out.Listing.ID)
	delReq = delReq.WithContext(context.WithValue(delReq.Context(), ctxUserKey, &User{ID: owner}))
	delRec := httptest.NewRecorder()
	handleDeleteListing(delRec, delReq)
	if delRec.Code != http.StatusInternalServerError {
		t.Fatalf("delete status = %d, want 500, body = %s", delRec.Code, delRec.Body.String())
	}

	var listingCount, docCount int
	db.QueryRow(`SELECT COUNT(*) FROM listings WHERE id = ?`, out.Listing.ID).Scan(&listingCount)
	db.QueryRow(`SELECT COUNT(*) FROM listing_documents WHERE listing_id = ?`, out.Listing.ID).Scan(&docCount)
	if listingCount != 1 || docCount != 1 {
		t.Fatalf("want rows preserved after failed delete, listing=%d document=%d", listingCount, docCount)
	}
	if _, err := os.Stat(path); err != nil {
		t.Fatalf("want file preserved after failed delete: %v", err)
	}
}

func TestAdminDeleteListingNotFound(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/listings/"+newID(), nil)
	req.SetPathValue("id", newID())
	rec := httptest.NewRecorder()
	handleAdminDeleteListing(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404, body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminDeleteListingSuccess(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	rec := createListingAs(t, owner, newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes))
	var out struct {
		Listing Listing `json:"listing"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	doc, err := loadListingDocument(out.Listing.ID)
	if err != nil {
		t.Fatalf("load doc: %v", err)
	}
	path := filepath.Join(privateDocumentsDir, doc.storedName)

	req := httptest.NewRequest(http.MethodDelete, "/api/admin/listings/"+out.Listing.ID, nil)
	req.SetPathValue("id", out.Listing.ID)
	delRec := httptest.NewRecorder()
	handleAdminDeleteListing(delRec, req)
	if delRec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body = %s", delRec.Code, delRec.Body.String())
	}

	var listingCount int
	db.QueryRow(`SELECT COUNT(*) FROM listings WHERE id = ?`, out.Listing.ID).Scan(&listingCount)
	if listingCount != 0 {
		t.Fatalf("want listing row deleted")
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("want file removed, stat err = %v", err)
	}
}

type failingWriter struct{}

func (failingWriter) Write(p []byte) (int, error) {
	return 0, io.ErrClosedPipe
}

func TestCopyDocumentBodyReturnsWriteError(t *testing.T) {
	err := copyDocumentBody(failingWriter{}, bytes.NewReader(pdfBytes))
	if err == nil {
		t.Fatalf("want error from failing writer, got nil")
	}
}

type failingReader struct{}

func (failingReader) Read(p []byte) (int, error) {
	return 0, io.ErrUnexpectedEOF
}

func TestCopyDocumentBodyReturnsReadError(t *testing.T) {
	err := copyDocumentBody(&bytes.Buffer{}, failingReader{})
	if err == nil {
		t.Fatalf("want error from failing reader, got nil")
	}
}

func assertNoListingsCreated(t *testing.T) {
	t.Helper()
	var n int
	db.QueryRow(`SELECT COUNT(*) FROM listings`).Scan(&n)
	if n != 0 {
		t.Fatalf("want no listings created, got %d", n)
	}
}

func assertPrivateDirEmpty(t *testing.T) {
	t.Helper()
	entries, err := os.ReadDir(privateDocumentsDir)
	if err != nil {
		t.Fatalf("read private dir: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("want empty private documents dir, got %v", entries)
	}
}
