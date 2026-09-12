package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

var (
	errRevisionPending       = errors.New("revision_pending")
	errRevisionNotFound      = errors.New("revision_not_found")
	errRevisionResolved      = errors.New("revision_already_resolved")
	errRevisionInvalidAction = errors.New("invalid_action")
	errRevisionInvalidReason = errors.New("invalid_reason")
	errRevisionCorrupt       = errors.New("revision_corrupt")
)

const revisionCols = `id, listing_id, owner_id, payload, status, created_at, resolved_at, resolved_by, reason`

func scanRevision(row interface {
	Scan(dest ...any) error
}) (*ListingRevision, error) {
	var rv ListingRevision
	var resolvedAt sql.NullTime
	var resolvedBy sql.NullString
	err := row.Scan(&rv.ID, &rv.ListingID, &rv.OwnerID, &rv.Payload, &rv.Status, &rv.CreatedAt, &resolvedAt, &resolvedBy, &rv.Reason)
	if err != nil {
		return nil, err
	}
	if resolvedAt.Valid {
		t := resolvedAt.Time
		rv.ResolvedAt = &t
	}
	if resolvedBy.Valid {
		s := resolvedBy.String
		rv.ResolvedBy = &s
	}
	return &rv, nil
}

type pendingRevisionMeta struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

func loadPendingRevision(listingID string) (*pendingRevisionMeta, error) {
	var m pendingRevisionMeta
	err := db.QueryRow(`SELECT id, status, created_at FROM listing_revisions WHERE listing_id = ? AND status = 'pending'`, listingID).
		Scan(&m.ID, &m.Status, &m.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

type revisionOut struct {
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

func createListingRevision(listingID, ownerID string, in listingInput, now time.Time) (*revisionOut, error) {
	payload, err := json.Marshal(in)
	if err != nil {
		return nil, err
	}
	id := newID()
	_, err = db.Exec(`INSERT INTO listing_revisions(id, listing_id, owner_id, payload, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)`,
		id, listingID, ownerID, string(payload), now)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, errRevisionPending
		}
		return nil, err
	}
	return &revisionOut{ID: id, Status: "pending", CreatedAt: now}, nil
}

type revisionDetail struct {
	listingInput
	ID        string    `json:"id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

func handleGetListingRevision(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	rev, err := scanRevision(db.QueryRow(`SELECT `+revisionCols+` FROM listing_revisions WHERE listing_id = ? AND status = 'pending'`, l.ID))
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	var in listingInput
	if err := json.Unmarshal([]byte(rev.Payload), &in); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, revisionDetail{listingInput: in, ID: rev.ID, Status: rev.Status, CreatedAt: rev.CreatedAt})
}

func handleAdminListRevisions(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	sqlStr := `SELECT ` + revisionCols + ` FROM listing_revisions`
	args := []any{}
	if status != "" {
		sqlStr += ` WHERE status = ?`
		args = append(args, status)
	}
	sqlStr += ` ORDER BY created_at DESC LIMIT 300`
	rows, err := db.Query(sqlStr, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	revisions := []*ListingRevision{}
	for rows.Next() {
		rv, err := scanRevision(rows)
		if err != nil {
			rows.Close()
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		revisions = append(revisions, rv)
	}
	if err := rows.Err(); err != nil {
		rows.Close()
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	rows.Close()

	out := []map[string]any{}
	for _, rv := range revisions {
		var in listingInput
		if err := json.Unmarshal([]byte(rv.Payload), &in); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}

		var listingOut any
		l, err := scanListing(db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, rv.ListingID))
		switch {
		case errors.Is(err, sql.ErrNoRows):
			listingOut = nil
		case err != nil:
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		default:
			l.Photos = loadPhotos(l.ID)
			listingOut = l
		}

		var owner User
		err = db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, rv.OwnerID).
			Scan(&owner.ID, &owner.Phone, &owner.Name, &owner.Role, &owner.Ini, &owner.CreatedAt)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}

		out = append(out, map[string]any{
			"revision": rv,
			"owner":    map[string]any{"id": owner.ID, "name": owner.Name, "phone": owner.Phone, "ini": owner.Ini},
			"listing":  listingOut,
			"proposed": in,
		})
	}
	writeJSON(w, http.StatusOK, out)
}

type adminRevisionResolveInput struct {
	Action string `json:"action"`
	Reason string `json:"reason"`
}

func handleAdminResolveRevision(w http.ResponseWriter, r *http.Request) {
	a := adminFromCtx(r.Context())
	id := r.PathValue("id")
	var in adminRevisionResolveInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	rev, err := resolveRevision(id, in.Action, in.Reason, a.ID, time.Now())
	switch {
	case errors.Is(err, errRevisionInvalidAction):
		writeErr(w, http.StatusBadRequest, "invalid_action")
	case errors.Is(err, errRevisionInvalidReason):
		writeErr(w, http.StatusBadRequest, "invalid_reason")
	case errors.Is(err, errRevisionNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case errors.Is(err, errRevisionResolved):
		writeErr(w, http.StatusConflict, "revision_already_resolved")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "revision": rev})
	}
}

func resolveRevision(id, action, reason, adminID string, now time.Time) (*ListingRevision, error) {
	if action != "approve" && action != "reject" {
		return nil, errRevisionInvalidAction
	}
	reason = strings.TrimSpace(reason)
	if action == "reject" && (reason == "" || len([]rune(reason)) > 500) {
		return nil, errRevisionInvalidReason
	}
	newStatus := "approved"
	if action == "reject" {
		newStatus = "rejected"
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	res, err := tx.Exec(`UPDATE listing_revisions SET status=?, resolved_at=?, resolved_by=?, reason=? WHERE id=? AND status='pending'`,
		newStatus, now, adminID, reason, id)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n != 1 {
		var exists int
		err := tx.QueryRow(`SELECT 1 FROM listing_revisions WHERE id = ?`, id).Scan(&exists)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errRevisionNotFound
		}
		if err != nil {
			return nil, err
		}
		return nil, errRevisionResolved
	}

	rev, err := scanRevision(tx.QueryRow(`SELECT `+revisionCols+` FROM listing_revisions WHERE id = ?`, id))
	if err != nil {
		return nil, err
	}

	l, err := scanListing(tx.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, rev.ListingID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errListingNotFound
	}
	if err != nil {
		return nil, err
	}
	if l.OwnerID != rev.OwnerID {
		return nil, errNotOwner
	}

	var in listingInput
	if err := json.Unmarshal([]byte(rev.Payload), &in); err != nil {
		return nil, errRevisionCorrupt
	}
	if err := validateListingInput(in); err != nil {
		return nil, errRevisionCorrupt
	}

	if action == "approve" {
		if err := applyListingUpdateTx(tx, rev.ListingID, in, now); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return rev, nil
}

func applyListingUpdateTx(tx *sql.Tx, listingID string, in listingInput, now time.Time) error {
	featuresJSON, _ := json.Marshal(in.Features)
	res, err := tx.Exec(`UPDATE listings SET deal=?, city=?, district=?, street=?, lat=?, lng=?, price=?, rooms=?,
		area=?, floor=?, floors_total=?, features=?, description=?, deposit=?, cadastre_code=?, repair_condition=?, updated_at=? WHERE id=?`,
		in.Deal, in.City, in.District, in.Street, in.Lat, in.Lng, in.Price, in.Rooms, in.Area,
		in.Floor, in.FloorsTotal, string(featuresJSON), in.Description, in.Deposit, in.CadastreCode, in.RepairCondition, now, listingID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n != 1 {
		return errListingNotFound
	}
	return nil
}
