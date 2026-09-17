package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func baseListingInput() listingInput {
	return listingInput{Deal: "rent", City: "yerevan", Street: "Test str", Price: 100000, Area: 40, Floor: 4, FloorsTotal: 9, CadastreCode: "CAD-1", RepairCondition: "good", Features: []string{}}
}

func mustCreateFullListing(t *testing.T, ownerID, status string, in listingInput) string {
	t.Helper()
	id := newID()
	featuresJSON, _ := json.Marshal(in.Features)
	now := time.Now()
	_, err := db.Exec(`INSERT INTO listings
		(id, owner_id, deal, city, district, street, lat, lng, price, rooms, area, floor, floors_total,
		 features, description, deposit, cadastre_code, repair_condition, status, confirmed_at, expires_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, ownerID, in.Deal, in.City, in.District, in.Street, in.Lat, in.Lng, in.Price, in.Rooms, in.Area,
		in.Floor, in.FloorsTotal, string(featuresJSON), in.Description, in.Deposit, in.CadastreCode, in.RepairCondition, status, now, now.Add(72*time.Hour), now, now)
	if err != nil {
		t.Fatalf("create listing: %v", err)
	}
	return id
}

func putListing(t *testing.T, ownerID, listingID string, in listingInput) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(in)
	req := httptest.NewRequest(http.MethodPut, "/api/listings/"+listingID, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.SetPathValue("id", listingID)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: ownerID}))
	rec := httptest.NewRecorder()
	handleUpdateListing(rec, req)
	return rec
}

func mustCreateAdmin(t *testing.T) string {
	t.Helper()
	id := newID()
	if _, err := db.Exec(`INSERT INTO admins(id, username, password_hash, password_salt) VALUES (?, ?, 'h', 's')`, id, id); err != nil {
		t.Fatalf("create admin: %v", err)
	}
	return id
}

func resolveRevisionRequest(t *testing.T, revisionID, action, reason string) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(adminRevisionResolveInput{Action: action, Reason: reason})
	req := httptest.NewRequest(http.MethodPost, "/api/admin/revisions/"+revisionID+"/resolve", bytes.NewReader(body))
	req.SetPathValue("id", revisionID)
	req = req.WithContext(context.WithValue(req.Context(), ctxAdminCtxKey, &Admin{ID: mustCreateAdmin(t), Username: "root"}))
	rec := httptest.NewRecorder()
	handleAdminResolveRevision(rec, req)
	return rec
}

func createdRevisionID(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var out struct {
		Revision struct {
			ID string `json:"id"`
		} `json:"revision"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode revision response: %v, body=%s", err, rec.Body.String())
	}
	if out.Revision.ID == "" {
		t.Fatalf("empty revision id, body=%s", rec.Body.String())
	}
	return out.Revision.ID
}

func setupTestUploads(t *testing.T) {
	t.Helper()
	prev := uploadsDir
	uploadsDir = t.TempDir()
	t.Cleanup(func() { uploadsDir = prev })
}

// ---------- PUT /api/listings/{id}: revision creation vs direct apply ----------

func TestUpdateActiveListingCreatesPendingRevision(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	changed := base
	changed.Street = "New str 5"
	rec := putListing(t, owner, listing, changed)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out struct {
		ReviewStatus string `json:"reviewStatus"`
		Revision     struct {
			ID        string    `json:"id"`
			Status    string    `json:"status"`
			CreatedAt time.Time `json:"createdAt"`
		} `json:"revision"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.ReviewStatus != "pending" || out.Revision.Status != "pending" || out.Revision.ID == "" {
		t.Fatalf("unexpected response: %+v", out)
	}

	l := loadListingForTest(t, listing)
	if l.Street != "Test str" {
		t.Fatalf("base listing changed: street=%q", l.Street)
	}

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=? AND status='pending'`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 pending revision, got %d", count)
	}
}

func TestUpdateActiveListingUnchangedReturnsNoChanges(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	rec := putListing(t, owner, listing, base)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "no_changes" {
		t.Fatalf("error = %q", body.Error)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("want no revision created, got %d", count)
	}
}

func TestUpdateActiveListingWhitespaceOnlyIsUnchanged(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	padded := base
	padded.Street = "  Test   str  "
	rec := putListing(t, owner, listing, padded)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestUpdateListingValidatesRequiredFields(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	bad := base
	bad.Street = "   "
	rec := putListing(t, owner, listing, bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != errListingInvalid.Error() {
		t.Fatalf("error = %q", body.Error)
	}
}

func TestUpdateListingInvalidRepairConditionRejected(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	bad := base
	bad.RepairCondition = "luxury"
	rec := putListing(t, owner, listing, bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("want no revision created for an invalid repair condition, got %d", count)
	}
}

func TestUpdateListingEmptyRepairConditionRejected(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	bad := base
	bad.RepairCondition = ""
	rec := putListing(t, owner, listing, bad)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestUpdateLegacyListingRequiresRealRepairConditionValue(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	if _, err := db.Exec(`UPDATE listings SET repair_condition='unspecified' WHERE id=?`, listing); err != nil {
		t.Fatalf("seed legacy repair_condition: %v", err)
	}

	stillUnspecified := base
	stillUnspecified.RepairCondition = "unspecified"
	rec := putListing(t, owner, listing, stillUnspecified)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	changed := base
	changed.RepairCondition = "cosmetic"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))
	if rec := resolveRevisionRequest(t, revID, "approve", ""); rec.Code != http.StatusOK {
		t.Fatalf("resolve status = %d, body = %s", rec.Code, rec.Body.String())
	}

	l := loadListingForTest(t, listing)
	if l.RepairCondition != "cosmetic" {
		t.Fatalf("repair_condition = %q, want cosmetic", l.RepairCondition)
	}
}

func TestUpdateActiveListingDuplicateRevisionConflict(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	first := base
	first.Street = "First street"
	rec1 := putListing(t, owner, listing, first)
	if rec1.Code != http.StatusAccepted {
		t.Fatalf("first status = %d, body = %s", rec1.Code, rec1.Body.String())
	}

	second := base
	second.Street = "Second street"
	rec2 := putListing(t, owner, listing, second)
	if rec2.Code != http.StatusConflict {
		t.Fatalf("second status = %d, body = %s", rec2.Code, rec2.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec2.Body.Bytes(), &body)
	if body.Error != "revision_pending" {
		t.Fatalf("error = %q", body.Error)
	}

	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 revision row, got %d", count)
	}
}

func TestUpdateActiveListingConcurrentCreatesOnlyOneRevision(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	var wg sync.WaitGroup
	codes := make([]int, 2)
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			in := base
			in.Street = fmt.Sprintf("Street %d", i)
			codes[i] = putListing(t, owner, listing, in).Code
		}(i)
	}
	wg.Wait()

	accepted, conflicts := 0, 0
	for _, c := range codes {
		switch c {
		case http.StatusAccepted:
			accepted++
		case http.StatusConflict:
			conflicts++
		default:
			t.Fatalf("unexpected status %d", c)
		}
	}
	if accepted != 1 || conflicts != 1 {
		t.Fatalf("want 1 accepted + 1 conflict, got %v", codes)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("want 1 revision row, got %d", count)
	}
}

func TestUpdatePendingListingAppliesDirectly(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "pending", base)

	changed := base
	changed.Street = "Direct street"
	rec := putListing(t, owner, listing, changed)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		ReviewStatus string `json:"reviewStatus"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.ReviewStatus != "listing_pending" {
		t.Fatalf("reviewStatus = %q", body.ReviewStatus)
	}

	l := loadListingForTest(t, listing)
	if l.Street != "Direct street" {
		t.Fatalf("street not updated: %q", l.Street)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&count)
	if count != 0 {
		t.Fatalf("want no revision rows for pending listing, got %d", count)
	}
}

// ---------- admin resolve ----------

func TestResolveRevisionApprovePreservesStatusAndVip(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	promotedUntil := time.Now().Add(3 * 24 * time.Hour)
	if _, err := db.Exec(`UPDATE listings SET promoted_until=? WHERE id=?`, promotedUntil, listing); err != nil {
		t.Fatalf("seed promoted_until: %v", err)
	}

	changed := base
	changed.Street = "Approved street"
	changed.Price = 222222
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	rec := resolveRevisionRequest(t, revID, "approve", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	l := loadListingForTest(t, listing)
	if l.Street != "Approved street" || l.Price != 222222 {
		t.Fatalf("fields not applied: %+v", l)
	}
	if l.Status != "active" {
		t.Fatalf("status changed: %q", l.Status)
	}
	if l.PromotedUntil == nil || l.PromotedUntil.Unix() != promotedUntil.Unix() {
		t.Fatalf("promoted_until changed: %v", l.PromotedUntil)
	}

	var status string
	db.QueryRow(`SELECT status FROM listing_revisions WHERE id=?`, revID).Scan(&status)
	if status != "approved" {
		t.Fatalf("revision status = %q", status)
	}
}

func TestResolveRevisionApproveAppliesRepairCondition(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	base.RepairCondition = "none"
	listing := mustCreateFullListing(t, owner, "active", base)

	changed := base
	changed.RepairCondition = "designer"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	rec := resolveRevisionRequest(t, revID, "approve", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	l := loadListingForTest(t, listing)
	if l.RepairCondition != "designer" {
		t.Fatalf("repair_condition = %q, want designer", l.RepairCondition)
	}
}

func TestResolveRevisionRejectLeavesListingUnchanged(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	changed := base
	changed.Street = "Rejected street"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	rec := resolveRevisionRequest(t, revID, "reject", "Fake cadastre code")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	l := loadListingForTest(t, listing)
	if l.Street != "Test str" {
		t.Fatalf("listing changed despite reject: %q", l.Street)
	}

	var status, reason string
	db.QueryRow(`SELECT status, reason FROM listing_revisions WHERE id=?`, revID).Scan(&status, &reason)
	if status != "rejected" || reason != "Fake cadastre code" {
		t.Fatalf("revision = %q/%q", status, reason)
	}
}

func TestResolveRevisionApprovePreservesNonActiveStatus(t *testing.T) {
	for _, status := range []string{"flagged", "archived", "rented"} {
		t.Run(status, func(t *testing.T) {
			setupTestDB(t)
			owner := mustCreateUser(t, "owner")
			base := baseListingInput()
			listing := mustCreateFullListing(t, owner, status, base)

			changed := base
			changed.Street = "New " + status
			putRec := putListing(t, owner, listing, changed)
			if putRec.Code != http.StatusAccepted {
				t.Fatalf("put status = %d, body = %s", putRec.Code, putRec.Body.String())
			}
			revID := createdRevisionID(t, putRec)

			rec := resolveRevisionRequest(t, revID, "approve", "")
			if rec.Code != http.StatusOK {
				t.Fatalf("resolve status = %d, body = %s", rec.Code, rec.Body.String())
			}

			l := loadListingForTest(t, listing)
			if l.Status != status {
				t.Fatalf("status changed: got %q want %q", l.Status, status)
			}
			if l.Street != "New "+status {
				t.Fatalf("street not applied: %q", l.Street)
			}
		})
	}
}

func TestResolveRevisionInvalidAction(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "X"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	rec := resolveRevisionRequest(t, revID, "banana", "")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var status string
	db.QueryRow(`SELECT status FROM listing_revisions WHERE id=?`, revID).Scan(&status)
	if status != "pending" {
		t.Fatalf("revision status changed despite invalid action: %q", status)
	}
}

func TestResolveRevisionRepeatConflict(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Twice"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	if rec := resolveRevisionRequest(t, revID, "approve", ""); rec.Code != http.StatusOK {
		t.Fatalf("first resolve status = %d, body = %s", rec.Code, rec.Body.String())
	}
	rec := resolveRevisionRequest(t, revID, "approve", "")
	if rec.Code != http.StatusConflict {
		t.Fatalf("second resolve status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Error string `json:"error"`
	}
	json.Unmarshal(rec.Body.Bytes(), &body)
	if body.Error != "revision_already_resolved" {
		t.Fatalf("error = %q", body.Error)
	}
}

func TestResolveRevisionNotFound(t *testing.T) {
	setupTestDB(t)
	rec := resolveRevisionRequest(t, newID(), "approve", "")
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestResolveRevisionRejectRequiresReason(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Needs reason"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	rec := resolveRevisionRequest(t, revID, "reject", "   ")
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	long := make([]byte, 501)
	for i := range long {
		long[i] = 'a'
	}
	rec = resolveRevisionRequest(t, revID, "reject", string(long))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("long reason status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var status string
	db.QueryRow(`SELECT status FROM listing_revisions WHERE id=?`, revID).Scan(&status)
	if status != "pending" {
		t.Fatalf("revision status changed despite invalid reason: %q", status)
	}
}

func TestResolveRevisionCorruptPayloadRollsBack(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Corrupt me"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	if _, err := db.Exec(`UPDATE listing_revisions SET payload = 'not json' WHERE id=?`, revID); err != nil {
		t.Fatalf("corrupt payload: %v", err)
	}

	rec := resolveRevisionRequest(t, revID, "approve", "")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var status string
	db.QueryRow(`SELECT status FROM listing_revisions WHERE id=?`, revID).Scan(&status)
	if status != "pending" {
		t.Fatalf("revision status = %q, want rollback to pending", status)
	}
	l := loadListingForTest(t, listing)
	if l.Street != "Test str" {
		t.Fatalf("listing changed despite corrupt payload: %q", l.Street)
	}
}

func TestResolveRevisionOwnerMismatchRollsBack(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	other := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Reassigned"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	if _, err := db.Exec(`UPDATE listings SET owner_id=? WHERE id=?`, other, listing); err != nil {
		t.Fatalf("reassign owner: %v", err)
	}

	rec := resolveRevisionRequest(t, revID, "approve", "")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var status string
	db.QueryRow(`SELECT status FROM listing_revisions WHERE id=?`, revID).Scan(&status)
	if status != "pending" {
		t.Fatalf("revision status = %q, want rollback to pending", status)
	}
}

func TestResolveRevisionForcedDBFailureRollsBack(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Fail street"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))

	if _, err := db.Exec(`CREATE TRIGGER force_fail_listing_revision_approve BEFORE UPDATE ON listings
		WHEN NEW.street = 'Fail street' BEGIN SELECT RAISE(ABORT, 'forced failure'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	rec := resolveRevisionRequest(t, revID, "approve", "")
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var status string
	db.QueryRow(`SELECT status FROM listing_revisions WHERE id=?`, revID).Scan(&status)
	if status != "pending" {
		t.Fatalf("revision status = %q, want pending after rollback", status)
	}
	l := loadListingForTest(t, listing)
	if l.Street != "Test str" {
		t.Fatalf("listing changed despite forced failure: %q", l.Street)
	}
}

// ---------- GET /api/listings/{id}/revision ----------

func TestGetListingRevisionOwnerOnly(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	stranger := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Proposed street"
	putListing(t, owner, listing, changed)

	ownerReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing+"/revision", nil)
	ownerReq.SetPathValue("id", listing)
	ownerReq = ownerReq.WithContext(context.WithValue(ownerReq.Context(), ctxUserKey, &User{ID: owner}))
	ownerRec := httptest.NewRecorder()
	handleGetListingRevision(ownerRec, ownerReq)
	if ownerRec.Code != http.StatusOK {
		t.Fatalf("owner status = %d, body = %s", ownerRec.Code, ownerRec.Body.String())
	}
	var out revisionDetail
	json.Unmarshal(ownerRec.Body.Bytes(), &out)
	if out.Street != "Proposed street" || out.Status != "pending" || out.ID == "" {
		t.Fatalf("unexpected revision detail: %+v", out)
	}

	strangerReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing+"/revision", nil)
	strangerReq.SetPathValue("id", listing)
	strangerReq = strangerReq.WithContext(context.WithValue(strangerReq.Context(), ctxUserKey, &User{ID: stranger}))
	strangerRec := httptest.NewRecorder()
	handleGetListingRevision(strangerRec, strangerReq)
	if strangerRec.Code != http.StatusForbidden {
		t.Fatalf("stranger status = %d", strangerRec.Code)
	}
}

func TestGetListingRevisionNotFoundWhenNoPending(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)

	req := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing+"/revision", nil)
	req.SetPathValue("id", listing)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleGetListingRevision(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d", rec.Code)
	}
}

// ---------- privacy: mine / public detail ----------

func TestPendingRevisionHiddenFromStrangersAndAnonymous(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	stranger := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Secret street"
	putListing(t, owner, listing, changed)

	anonReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	anonReq.SetPathValue("id", listing)
	anonRec := httptest.NewRecorder()
	handleGetListing(anonRec, anonReq)
	if bytes.Contains(anonRec.Body.Bytes(), []byte("pendingRevision")) || bytes.Contains(anonRec.Body.Bytes(), []byte("Secret street")) {
		t.Fatalf("anonymous response leaks revision: %s", anonRec.Body.String())
	}

	strangerReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	strangerReq.SetPathValue("id", listing)
	strangerReq = strangerReq.WithContext(context.WithValue(strangerReq.Context(), ctxUserKey, &User{ID: stranger}))
	strangerRec := httptest.NewRecorder()
	handleGetListing(strangerRec, strangerReq)
	if bytes.Contains(strangerRec.Body.Bytes(), []byte("pendingRevision")) || bytes.Contains(strangerRec.Body.Bytes(), []byte("Secret street")) {
		t.Fatalf("stranger response leaks revision: %s", strangerRec.Body.String())
	}

	ownerReq := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	ownerReq.SetPathValue("id", listing)
	ownerReq = ownerReq.WithContext(context.WithValue(ownerReq.Context(), ctxUserKey, &User{ID: owner}))
	ownerRec := httptest.NewRecorder()
	handleGetListing(ownerRec, ownerReq)
	if !bytes.Contains(ownerRec.Body.Bytes(), []byte("pendingRevision")) {
		t.Fatalf("owner should see pendingRevision metadata: %s", ownerRec.Body.String())
	}
	if bytes.Contains(ownerRec.Body.Bytes(), []byte("Secret street")) {
		t.Fatalf("owner detail endpoint should not leak proposed payload: %s", ownerRec.Body.String())
	}
}

func TestMyListingsIncludesPendingRevisionMetadata(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Mine street"
	putListing(t, owner, listing, changed)

	req := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleMyListings(rec, req)

	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	found := false
	for _, entry := range out {
		l := entry["listing"].(map[string]any)
		if l["id"] != listing {
			continue
		}
		pr, ok := entry["pendingRevision"].(map[string]any)
		if !ok {
			t.Fatalf("missing pendingRevision metadata: %+v", entry)
		}
		if pr["status"] != "pending" {
			t.Fatalf("pendingRevision status = %v", pr["status"])
		}
		found = true
	}
	if !found {
		t.Fatalf("listing missing from /mine")
	}
}

// ---------- admin list ----------

func TestAdminListRevisionsPendingOnly(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Listed street"
	putListing(t, owner, listing, changed)

	req := httptest.NewRequest(http.MethodGet, "/api/admin/revisions?status=pending", nil)
	rec := httptest.NewRecorder()
	handleAdminListRevisions(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 {
		t.Fatalf("want 1 pending revision, got %d", len(out))
	}
	entry := out[0]
	rev := entry["revision"].(map[string]any)
	if rev["status"] != "pending" {
		t.Fatalf("revision status = %v", rev["status"])
	}
	if _, leaked := rev["payload"]; leaked {
		t.Fatalf("revision payload leaked: %+v", rev)
	}
	proposed := entry["proposed"].(map[string]any)
	if proposed["street"] != "Listed street" {
		t.Fatalf("proposed street = %v", proposed["street"])
	}
	ownerOut := entry["owner"].(map[string]any)
	if ownerOut["id"] != owner {
		t.Fatalf("owner mismatch: %v", ownerOut)
	}
	listingOut := entry["listing"].(map[string]any)
	if listingOut["id"] != listing {
		t.Fatalf("listing mismatch: %v", listingOut)
	}
}

// ---------- photo uploads bypass moderation ----------

func TestUploadPhotoBlockedUnlessPending(t *testing.T) {
	for _, status := range []string{"active", "flagged", "archived", "rented"} {
		t.Run(status, func(t *testing.T) {
			setupTestDB(t)
			owner := mustCreateUser(t, "owner")
			listing := mustCreateListing(t, owner, status)

			body := &bytes.Buffer{}
			mw := multipart.NewWriter(body)
			part, _ := mw.CreateFormFile("photo", "a.jpg")
			part.Write(jpegBytes)
			mw.Close()

			req := httptest.NewRequest(http.MethodPost, "/api/listings/"+listing+"/photos", body)
			req.Header.Set("Content-Type", mw.FormDataContentType())
			req.SetPathValue("id", listing)
			req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
			rec := httptest.NewRecorder()
			handleUploadListingPhoto(rec, req)
			if rec.Code != http.StatusConflict {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
			}
			var out struct {
				Error string `json:"error"`
			}
			json.Unmarshal(rec.Body.Bytes(), &out)
			if out.Error != "changes_require_review" {
				t.Fatalf("error = %q", out.Error)
			}
		})
	}
}

func TestUploadPhotoAllowedWhenPending(t *testing.T) {
	setupTestDB(t)
	setupTestUploads(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "pending")

	body := &bytes.Buffer{}
	mw := multipart.NewWriter(body)
	part, _ := mw.CreateFormFile("photo", "a.jpg")
	part.Write(jpegBytes)
	mw.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/listings/"+listing+"/photos", body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.SetPathValue("id", listing)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleUploadListingPhoto(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestDeletePhotoBlockedUnlessPending(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	db.Exec(`INSERT INTO listing_photos(listing_id, url, position) VALUES (?, ?, 0)`, listing, "/uploads/x.jpg")

	req := httptest.NewRequest(http.MethodDelete, "/api/listings/"+listing+"/photos?url=/uploads/x.jpg", nil)
	req.SetPathValue("id", listing)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleDeleteListingPhoto(rec, req)
	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM listing_photos WHERE listing_id=?`, listing).Scan(&count)
	if count != 1 {
		t.Fatalf("photo should not be removed, count = %d", count)
	}
}

// ---------- cascade delete ----------

func TestDeleteListingCascadesRevisions(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Cascade street"
	putListing(t, owner, listing, changed)

	var before int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&before)
	if before != 1 {
		t.Fatalf("want 1 revision before delete, got %d", before)
	}

	if err := deleteListingAndDocument(listing); err != nil {
		t.Fatalf("delete: %v", err)
	}
	var after int
	db.QueryRow(`SELECT COUNT(*) FROM listing_revisions WHERE listing_id=?`, listing).Scan(&after)
	if after != 0 {
		t.Fatalf("want revisions cascade-deleted, got %d", after)
	}
}

// ---------- error handling ----------

func TestLoadPendingRevisionNilWhenNonePending(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")

	m, err := loadPendingRevision(listing)
	if err != nil || m != nil {
		t.Fatalf("want nil,nil, got %+v,%v", m, err)
	}
}

func TestLoadPendingRevisionPropagatesDBError(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE listing_revisions`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	m, err := loadPendingRevision(listing)
	if err == nil {
		t.Fatalf("want error, got nil (m=%+v)", m)
	}
	if m != nil {
		t.Fatalf("want nil meta on error, got %+v", m)
	}
}

func TestGetListingReturns500WhenPendingRevisionLookupFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE listing_revisions`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings/"+listing, nil)
	req.SetPathValue("id", listing)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleGetListing(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestMyListingsReturns500WhenPendingRevisionLookupFails(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`DROP TABLE listing_revisions`); err != nil {
		t.Fatalf("drop table: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner}))
	rec := httptest.NewRecorder()
	handleMyListings(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminListRevisionsScanErrorReturns500(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	if _, err := db.Exec(`INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status, created_at) VALUES (?, ?, ?, '{}', 'pending', 'not-a-date')`,
		newID(), listing, owner); err != nil {
		t.Fatalf("insert malformed revision: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/revisions", nil)
	rec := httptest.NewRecorder()
	handleAdminListRevisions(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminListRevisionsCorruptPayloadReturns500(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "active", base)
	changed := base
	changed.Street = "Corrupt street"
	revID := createdRevisionID(t, putListing(t, owner, listing, changed))
	if _, err := db.Exec(`UPDATE listing_revisions SET payload='not json' WHERE id=?`, revID); err != nil {
		t.Fatalf("corrupt payload: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/admin/revisions", nil)
	rec := httptest.NewRecorder()
	handleAdminListRevisions(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestAdminListRevisionsListingMissingRendersNull(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	rid := newID()

	c, err := db.Conn(context.Background())
	if err != nil {
		t.Fatalf("conn: %v", err)
	}
	if _, err := c.ExecContext(context.Background(), `PRAGMA foreign_keys=OFF`); err != nil {
		t.Fatalf("pragma off: %v", err)
	}
	if _, err := c.ExecContext(context.Background(), `INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status) VALUES (?, 'missing-listing', ?, '{}', 'pending')`, rid, owner); err != nil {
		t.Fatalf("insert orphan revision: %v", err)
	}
	c.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/admin/revisions", nil)
	rec := httptest.NewRecorder()
	handleAdminListRevisions(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 {
		t.Fatalf("want 1 revision, got %d", len(out))
	}
	if out[0]["listing"] != nil {
		t.Fatalf("want listing:null, got %v", out[0]["listing"])
	}
}

func TestAdminListRevisionsOwnerMissingReturns500(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	listing := mustCreateListing(t, owner, "active")
	rid := newID()

	c, err := db.Conn(context.Background())
	if err != nil {
		t.Fatalf("conn: %v", err)
	}
	if _, err := c.ExecContext(context.Background(), `PRAGMA foreign_keys=OFF`); err != nil {
		t.Fatalf("pragma off: %v", err)
	}
	if _, err := c.ExecContext(context.Background(), `INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status) VALUES (?, ?, 'missing-owner', '{}', 'pending')`, rid, listing); err != nil {
		t.Fatalf("insert orphan revision: %v", err)
	}
	c.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/admin/revisions", nil)
	rec := httptest.NewRecorder()
	handleAdminListRevisions(rec, req)
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestApplyListingUpdateReturnsNotFoundOnConcurrentDelete(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	base := baseListingInput()
	listing := mustCreateFullListing(t, owner, "pending", base)
	if err := deleteListingAndDocument(listing); err != nil {
		t.Fatalf("delete: %v", err)
	}

	changed := base
	changed.Street = "Ghost street"
	err := applyListingUpdate(listing, changed, time.Now())
	if !errors.Is(err, errListingNotFound) {
		t.Fatalf("err = %v, want errListingNotFound", err)
	}
}
