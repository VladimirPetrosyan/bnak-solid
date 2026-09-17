package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"
)

// Минимальная версия ростера агентства: агент — это контакт внутри аккаунта агентства
// (имя + телефон), без отдельного логина и без разграничения прав. Аккаунт агентства сам
// добавляет агентов и назначает ответственного за конкретный объект. Права, передача
// ответственности и обработка заблокированного/удалённого агента — намеренно не в этой
// версии, см. project_qa_backlog_v3 в памяти сессии.

const maxAgentNameLen = 80
const maxAgentPhoneLen = 32

var (
	errAgentNameRequired = errors.New("agent_name_required")
	errAgentNotFound     = errors.New("agent_not_found")
)

type agencyAgentInput struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

// ---------- POST /api/agency/agents ----------

func handleCreateAgencyAgent(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	if u.Role != "agency" {
		writeErr(w, http.StatusForbidden, "agency_role_required")
		return
	}
	var in agencyAgentInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	name := strings.TrimSpace(in.Name)
	if name == "" {
		writeErr(w, http.StatusBadRequest, errAgentNameRequired.Error())
		return
	}
	if len(name) > maxAgentNameLen {
		name = name[:maxAgentNameLen]
	}
	phone := strings.TrimSpace(in.Phone)
	if len(phone) > maxAgentPhoneLen {
		phone = phone[:maxAgentPhoneLen]
	}

	id := newID()
	now := time.Now()
	if _, err := db.Exec(`INSERT INTO agency_agents(id, agency_id, name, phone, created_at) VALUES (?, ?, ?, ?, ?)`,
		id, u.ID, name, phone, now); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, AgencyAgent{ID: id, AgencyID: u.ID, Name: name, Phone: phone, CreatedAt: now})
}

// ---------- GET /api/agency/agents ----------

func handleMyAgencyAgents(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	if u.Role != "agency" {
		writeErr(w, http.StatusForbidden, "agency_role_required")
		return
	}
	rows, err := db.Query(`SELECT id, agency_id, name, phone, created_at FROM agency_agents WHERE agency_id = ? ORDER BY created_at`, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	out := []AgencyAgent{}
	for rows.Next() {
		var a AgencyAgent
		if err := rows.Scan(&a.ID, &a.AgencyID, &a.Name, &a.Phone, &a.CreatedAt); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		out = append(out, a)
	}
	writeJSON(w, http.StatusOK, out)
}

// responsibleAgents — id объявления -> {id, name} назначенного агента, для строк "мои объекты".
func responsibleAgents(listingIDs []string) (map[string]AgencyAgent, error) {
	out := map[string]AgencyAgent{}
	if len(listingIDs) == 0 {
		return out, nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(listingIDs)), ",")
	args := make([]any, len(listingIDs))
	for i, id := range listingIDs {
		args[i] = id
	}
	rows, err := db.Query(`SELECT la.listing_id, a.id, a.agency_id, a.name, a.phone, a.created_at
		FROM listing_agents la JOIN agency_agents a ON a.id = la.agent_id
		WHERE la.listing_id IN (`+placeholders+`)`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var listingID string
		var a AgencyAgent
		if err := rows.Scan(&listingID, &a.ID, &a.AgencyID, &a.Name, &a.Phone, &a.CreatedAt); err != nil {
			return nil, err
		}
		out[listingID] = a
	}
	return out, rows.Err()
}

// ---------- PUT /api/listings/{id}/responsible-agent ----------

type responsibleAgentInput struct {
	AgentID string `json:"agentId"`
}

func handleSetResponsibleAgent(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	u := userFromCtx(r.Context())
	if u.Role != "agency" {
		writeErr(w, http.StatusForbidden, "agency_role_required")
		return
	}
	var in responsibleAgentInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	agentID := strings.TrimSpace(in.AgentID)
	if agentID == "" {
		if _, err := db.Exec(`DELETE FROM listing_agents WHERE listing_id = ?`, l.ID); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		return
	}

	var owns string
	err := db.QueryRow(`SELECT agency_id FROM agency_agents WHERE id = ?`, agentID).Scan(&owns)
	if errors.Is(err, sql.ErrNoRows) || (err == nil && owns != u.ID) {
		writeErr(w, http.StatusBadRequest, errAgentNotFound.Error())
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	if _, err := db.Exec(`INSERT INTO listing_agents(listing_id, agent_id) VALUES (?, ?)
		ON CONFLICT(listing_id) DO UPDATE SET agent_id = excluded.agent_id`, l.ID, agentID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
