package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func agentBody(t *testing.T, name, phone string) *bytes.Reader {
	t.Helper()
	b, err := json.Marshal(agencyAgentInput{Name: name, Phone: phone})
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return bytes.NewReader(b)
}

func createAgentAs(t *testing.T, agencyID, name, phone string) AgencyAgent {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/agency/agents", agentBody(t, name, phone))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: agencyID, Role: "agency"}))
	rec := httptest.NewRecorder()
	handleCreateAgencyAgent(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create agent: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var a AgencyAgent
	if err := json.Unmarshal(rec.Body.Bytes(), &a); err != nil {
		t.Fatalf("decode agent: %v", err)
	}
	return a
}

func TestCreateAgencyAgentRequiresAgencyRole(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")

	req := httptest.NewRequest(http.MethodPost, "/api/agency/agents", agentBody(t, "Ани", "+374 55 000000"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: owner, Role: "owner"}))
	rec := httptest.NewRecorder()
	handleCreateAgencyAgent(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s, want 403", rec.Code, rec.Body.String())
	}
}

func TestCreateAgencyAgentRequiresName(t *testing.T) {
	setupTestDB(t)
	agency := mustCreateUser(t, "agency")

	req := httptest.NewRequest(http.MethodPost, "/api/agency/agents", agentBody(t, "   ", "+374 55 000000"))
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: agency, Role: "agency"}))
	rec := httptest.NewRecorder()
	handleCreateAgencyAgent(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s, want 400", rec.Code, rec.Body.String())
	}
}

func TestListAgencyAgentsReturnsOwnAgentsOnly(t *testing.T) {
	setupTestDB(t)
	agencyA := mustCreateUser(t, "agency")
	agencyB := mustCreateUser(t, "agency")
	createAgentAs(t, agencyA, "Ани", "")
	createAgentAs(t, agencyB, "Гоар", "")

	req := httptest.NewRequest(http.MethodGet, "/api/agency/agents", nil)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: agencyA, Role: "agency"}))
	rec := httptest.NewRecorder()
	handleMyAgencyAgents(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var list []AgencyAgent
	if err := json.Unmarshal(rec.Body.Bytes(), &list); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(list) != 1 || list[0].Name != "Ани" {
		t.Fatalf("got %+v, want only agencyA's own agent", list)
	}
}

func agencyListingID(t *testing.T, agencyID string) string {
	t.Helper()
	setupTestPrivateDocs(t)
	req := newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAsRole(t, agencyID, "agency", req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("create listing: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	listing := out["listing"].(map[string]any)
	return listing["id"].(string)
}

func setResponsibleAgentAs(t *testing.T, userID, role, listingID, agentID string) *httptest.ResponseRecorder {
	t.Helper()
	b, _ := json.Marshal(responsibleAgentInput{AgentID: agentID})
	req := httptest.NewRequest(http.MethodPut, "/api/listings/"+listingID+"/responsible-agent", bytes.NewReader(b))
	req.SetPathValue("id", listingID)
	req = req.WithContext(context.WithValue(req.Context(), ctxUserKey, &User{ID: userID, Role: role}))
	rec := httptest.NewRecorder()
	handleSetResponsibleAgent(rec, req)
	return rec
}

func TestSetResponsibleAgentAssignsAndClears(t *testing.T) {
	setupTestDB(t)
	agency := mustCreateUser(t, "agency")
	listingID := agencyListingID(t, agency)
	agent := createAgentAs(t, agency, "Ани", "+374 55 000000")

	rec := setResponsibleAgentAs(t, agency, "agency", listingID, agent.ID)
	if rec.Code != http.StatusOK {
		t.Fatalf("assign: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	agents, err := responsibleAgents([]string{listingID})
	if err != nil {
		t.Fatalf("responsibleAgents: %v", err)
	}
	if agents[listingID].ID != agent.ID {
		t.Fatalf("got %+v, want agent %s assigned", agents[listingID], agent.ID)
	}

	rec = setResponsibleAgentAs(t, agency, "agency", listingID, "")
	if rec.Code != http.StatusOK {
		t.Fatalf("clear: status = %d, body = %s", rec.Code, rec.Body.String())
	}
	agents, err = responsibleAgents([]string{listingID})
	if err != nil {
		t.Fatalf("responsibleAgents: %v", err)
	}
	if _, ok := agents[listingID]; ok {
		t.Fatalf("agent still assigned after clearing: %+v", agents[listingID])
	}
}

func TestSetResponsibleAgentRejectsForeignAgent(t *testing.T) {
	setupTestDB(t)
	agencyA := mustCreateUser(t, "agency")
	agencyB := mustCreateUser(t, "agency")
	listingID := agencyListingID(t, agencyA)
	foreignAgent := createAgentAs(t, agencyB, "Гоар", "")

	rec := setResponsibleAgentAs(t, agencyA, "agency", listingID, foreignAgent.ID)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %s, want 400", rec.Code, rec.Body.String())
	}
}

func TestSetResponsibleAgentRequiresOwnership(t *testing.T) {
	setupTestDB(t)
	agencyA := mustCreateUser(t, "agency")
	agencyB := mustCreateUser(t, "agency")
	listingID := agencyListingID(t, agencyA)
	agent := createAgentAs(t, agencyB, "Гоар", "")

	rec := setResponsibleAgentAs(t, agencyB, "agency", listingID, agent.ID)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s, want 403 (not agencyB's listing)", rec.Code, rec.Body.String())
	}
}

func TestSetResponsibleAgentRequiresAgencyRole(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "owner")
	req := newCreateListingRequest(t, validListingJSON(), "cert.pdf", pdfBytes)
	rec := createListingAsRole(t, owner, "owner", req)
	var out map[string]any
	json.Unmarshal(rec.Body.Bytes(), &out)
	listingID := out["listing"].(map[string]any)["id"].(string)

	rec = setResponsibleAgentAs(t, owner, "owner", listingID, "")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, body = %s, want 403 (not an agency account)", rec.Code, rec.Body.String())
	}
}
