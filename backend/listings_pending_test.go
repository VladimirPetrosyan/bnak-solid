package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreateListingIsPendingAndHiddenFromPublic(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "owner")

	in := listingInput{
		Deal: "rent", City: "yerevan", Street: "Test str",
		Price: 100000, Area: 40, CadastreCode: "CAD-1", RepairCondition: "good",
	}
	listingJSON, _ := json.Marshal(in)
	req := newCreateListingRequest(t, string(listingJSON), "cert.pdf", pdfBytes)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner, Role: "tenant"}))
	rec := httptest.NewRecorder()
	handleCreateListing(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Listing Listing `json:"listing"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Listing.Status != "pending" {
		t.Fatalf("status = %q, want pending", out.Listing.Status)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/listings", nil)
	listRec := httptest.NewRecorder()
	handleListListings(listRec, listReq)
	var publicOut []map[string]any
	json.Unmarshal(listRec.Body.Bytes(), &publicOut)
	for _, entry := range publicOut {
		listing := entry["listing"].(map[string]any)
		if listing["id"] == out.Listing.ID {
			t.Fatalf("pending listing must not be publicly visible")
		}
	}

	mineReq := httptest.NewRequest(http.MethodGet, "/api/listings/mine", nil)
	mineReq = mineReq.WithContext(context.WithValue(mineReq.Context(), ctxUserKey, &User{ID: owner}))
	mineRec := httptest.NewRecorder()
	handleMyListings(mineRec, mineReq)
	var mineOut []map[string]any
	json.Unmarshal(mineRec.Body.Bytes(), &mineOut)
	found := false
	for _, entry := range mineOut {
		listing := entry["listing"].(map[string]any)
		if listing["id"] == out.Listing.ID {
			found = true
		}
	}
	if !found {
		t.Fatalf("owner should see own pending listing in /mine")
	}
}
