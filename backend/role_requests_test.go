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

func roleRequestBody(t *testing.T, role string) *bytes.Reader {
	t.Helper()
	b, err := json.Marshal(map[string]string{"role": role})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return bytes.NewReader(b)
}

func createListingAsRole(t *testing.T, ownerID, role string, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: ownerID, Role: role}))
	rec := httptest.NewRecorder()
	handleCreateListing(rec, req)
	return rec
}

func hotelListingJSON() string {
	in := listingInput{Deal: "hotel", City: "yerevan", Street: "Test str", Title: "My Hotel", StayKind: "hotel", CheckIn: "14:00", CheckOut: "12:00"}
	b, _ := json.Marshal(in)
	return string(b)
}

func TestCreateListingRejectsHotelDealWithoutHotelRole(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "owner")

	req := newCreateListingRequest(t, hotelListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAsRole(t, owner, "owner", req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s, want 403", rec.Code, rec.Body.String())
	}
	assertNoListingsCreated(t)

	var role string
	db.QueryRow(`SELECT role FROM users WHERE id = ?`, owner).Scan(&role)
	if role != "owner" {
		t.Fatalf("role changed to %q, want unchanged owner (no auto-promotion bypass)", role)
	}
}

func TestCreateListingAllowsHotelDealWithHotelRole(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "hotel")

	req := newCreateListingRequest(t, hotelListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAsRole(t, owner, "hotel", req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateListingTenantPublishingHotelDealIsRejectedAndNotPromoted(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	tenant := mustCreateUser(t, "tenant")

	req := newCreateListingRequest(t, hotelListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAsRole(t, tenant, "tenant", req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s, want 403", rec.Code, rec.Body.String())
	}
	var role string
	db.QueryRow(`SELECT role FROM users WHERE id = ?`, tenant).Scan(&role)
	if role != "tenant" {
		t.Fatalf("role changed to %q, want unchanged tenant", role)
	}
}

func TestCreateListingTenantPublishingRentDealStillPromotesToOwner(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	tenant := mustCreateUser(t, "tenant")

	req := newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAs(t, tenant, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var role string
	db.QueryRow(`SELECT role FROM users WHERE id = ?`, tenant).Scan(&role)
	if role != "owner" {
		t.Fatalf("role = %q, want owner (ordinary listing still auto-promotes)", role)
	}
}

func TestCreateRoleRequestRejectsInvalidRole(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "tenant")

	req := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "admin"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleCreateRoleRequest(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateRoleRequestRejectsAlreadyHeldRole(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "agency")

	req := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "agency"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: u, Role: "agency"}))
	rec := httptest.NewRecorder()
	handleCreateRoleRequest(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestCreateRoleRequestRejectsDuplicatePending(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "tenant")

	req1 := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "agency"))
	req1 = req1.WithContext(context.WithValue(req1.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec1 := httptest.NewRecorder()
	handleCreateRoleRequest(rec1, req1)
	if rec1.Code != http.StatusCreated {
		t.Fatalf("first request: status = %d, body = %s", rec1.Code, rec1.Body.String())
	}

	req2 := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "hotel"))
	req2 = req2.WithContext(context.WithValue(req2.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec2 := httptest.NewRecorder()
	handleCreateRoleRequest(rec2, req2)
	if rec2.Code != http.StatusConflict {
		t.Fatalf("second request: status = %d, body = %s, want 409", rec2.Code, rec2.Body.String())
	}
}

func TestApproveRoleRequestPromotesUser(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "tenant")
	admin := mustCreateAdmin(t)

	req := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "agency"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleCreateRoleRequest(rec, req)
	var created RoleRequest
	if err := json.Unmarshal(rec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if err := resolveRoleRequest(created.ID, true, admin, time.Now()); err != nil {
		t.Fatalf("resolve: %v", err)
	}

	var role, status string
	db.QueryRow(`SELECT role FROM users WHERE id = ?`, u).Scan(&role)
	if role != "agency" {
		t.Fatalf("role = %q, want agency", role)
	}
	db.QueryRow(`SELECT status FROM role_requests WHERE id = ?`, created.ID).Scan(&status)
	if status != "approved" {
		t.Fatalf("status = %q, want approved", status)
	}
}

func TestRejectRoleRequestDoesNotChangeRole(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "tenant")
	admin := mustCreateAdmin(t)

	req := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "hotel"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleCreateRoleRequest(rec, req)
	var created RoleRequest
	json.Unmarshal(rec.Body.Bytes(), &created)

	if err := resolveRoleRequest(created.ID, false, admin, time.Now()); err != nil {
		t.Fatalf("resolve: %v", err)
	}

	var role string
	db.QueryRow(`SELECT role FROM users WHERE id = ?`, u).Scan(&role)
	if role != "tenant" {
		t.Fatalf("role = %q, want unchanged tenant", role)
	}
}

func TestResolveRoleRequestTwiceReturnsConflict(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "tenant")
	admin := mustCreateAdmin(t)

	req := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "agency"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleCreateRoleRequest(rec, req)
	var created RoleRequest
	json.Unmarshal(rec.Body.Bytes(), &created)

	if err := resolveRoleRequest(created.ID, true, admin, time.Now()); err != nil {
		t.Fatalf("first resolve: %v", err)
	}
	if err := resolveRoleRequest(created.ID, true, admin, time.Now()); err != errRoleRequestAlreadyResolved {
		t.Fatalf("second resolve: err = %v, want errRoleRequestAlreadyResolved", err)
	}
}

func TestMyRoleRequestReturnsLatest(t *testing.T) {
	setupTestDB(t)
	u := mustCreateUser(t, "tenant")

	req := httptest.NewRequest(http.MethodGet, "/api/role-requests/me", nil)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleMyRoleRequest(rec, req)
	if rec.Code != http.StatusOK || rec.Body.String() != "" {
		t.Fatalf("status = %d, body = %s, want 200 empty", rec.Code, rec.Body.String())
	}

	createReq := httptest.NewRequest(http.MethodPost, "/api/role-requests", roleRequestBody(t, "agency"))
	createReq = createReq.WithContext(context.WithValue(createReq.Context(), ctxUserKey, &User{ID: u, Role: "tenant"}))
	handleCreateRoleRequest(httptest.NewRecorder(), createReq)

	rec2 := httptest.NewRecorder()
	handleMyRoleRequest(rec2, req)
	var rq RoleRequest
	if err := json.Unmarshal(rec2.Body.Bytes(), &rq); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if rq.Role != "agency" || rq.Status != "pending" {
		t.Fatalf("got %+v, want pending agency request", rq)
	}
}
