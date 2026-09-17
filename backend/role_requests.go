package main

import (
	"database/sql"
	"errors"
	"net/http"
	"time"
)

// Повышение роли до agency/hotel никогда не применяется автоматически — пользователь
// подаёт заявку (role_requests), а решает её только поддержка через админку
// (handleAdminApproveRoleRequest/handleAdminRejectRoleRequest). Signup и обычная
// авто-смена tenant -> owner при публикации обычного объявления эту заявку не требуют.

var validRoleRequestTargets = map[string]bool{"agency": true, "hotel": true}

var (
	errRoleRequestInvalidRole     = errors.New("invalid role")
	errRoleRequestAlreadyHasRole  = errors.New("already has this role")
	errRoleRequestPendingExists   = errors.New("role request already pending")
	errRoleRequestNotFound        = errors.New("role_request_not_found")
	errRoleRequestAlreadyResolved = errors.New("role_request_already_resolved")
)

type roleRequestInput struct {
	Role string `json:"role"`
}

// ---------- POST /api/role-requests ----------

func handleCreateRoleRequest(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	var in roleRequestInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if !validRoleRequestTargets[in.Role] {
		writeErr(w, http.StatusBadRequest, errRoleRequestInvalidRole.Error())
		return
	}
	if u.Role == in.Role {
		writeErr(w, http.StatusBadRequest, errRoleRequestAlreadyHasRole.Error())
		return
	}
	var pending int
	db.QueryRow(`SELECT COUNT(*) FROM role_requests WHERE user_id = ? AND status = 'pending'`, u.ID).Scan(&pending)
	if pending > 0 {
		writeErr(w, http.StatusConflict, errRoleRequestPendingExists.Error())
		return
	}
	id := newID()
	now := time.Now()
	if _, err := db.Exec(`INSERT INTO role_requests(id, user_id, role, status, created_at) VALUES (?, ?, ?, 'pending', ?)`,
		id, u.ID, in.Role, now); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, RoleRequest{ID: id, UserID: u.ID, Role: in.Role, Status: "pending", CreatedAt: now})
}

// ---------- GET /api/role-requests/me ----------

func handleMyRoleRequest(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	row := db.QueryRow(`SELECT id, user_id, role, status, created_at, resolved_at, resolved_by FROM role_requests
		WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, u.ID)
	rq, err := scanRoleRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		writeJSON(w, http.StatusOK, nil)
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, rq)
}

func scanRoleRequest(row interface {
	Scan(dest ...any) error
}) (*RoleRequest, error) {
	var rq RoleRequest
	if err := row.Scan(&rq.ID, &rq.UserID, &rq.Role, &rq.Status, &rq.CreatedAt, &rq.ResolvedAt, &rq.ResolvedBy); err != nil {
		return nil, err
	}
	return &rq, nil
}

// ---------- GET /api/admin/role-requests?status= ----------

func handleAdminRoleRequests(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	sqlStr := `SELECT id, user_id, role, status, created_at, resolved_at, resolved_by FROM role_requests`
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
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		rq, err := scanRoleRequest(rows)
		if err != nil {
			continue
		}
		var u User
		db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, rq.UserID).
			Scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Ini, &u.CreatedAt)
		out = append(out, map[string]any{
			"request": rq,
			"user":    map[string]any{"id": u.ID, "name": u.Name, "phone": u.Phone, "role": u.Role, "ini": u.Ini},
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- POST /api/admin/role-requests/{id}/approve | reject ----------

func handleAdminResolveRoleRequest(approve bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		admin := adminFromCtx(r.Context())
		err := resolveRoleRequest(id, approve, admin.ID, time.Now())
		switch {
		case errors.Is(err, errRoleRequestNotFound):
			writeErr(w, http.StatusNotFound, "not found")
		case errors.Is(err, errRoleRequestAlreadyResolved):
			writeErr(w, http.StatusConflict, errRoleRequestAlreadyResolved.Error())
		case err != nil:
			writeErr(w, http.StatusInternalServerError, "db error")
		default:
			writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		}
	}
}

func resolveRoleRequest(id string, approve bool, adminID string, now time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var userID, role string
	err = tx.QueryRow(`SELECT user_id, role FROM role_requests WHERE id = ?`, id).Scan(&userID, &role)
	if errors.Is(err, sql.ErrNoRows) {
		return errRoleRequestNotFound
	}
	if err != nil {
		return err
	}

	newStatus := "rejected"
	if approve {
		newStatus = "approved"
	}
	res, err := tx.Exec(`UPDATE role_requests SET status=?, resolved_at=?, resolved_by=? WHERE id=? AND status='pending'`,
		newStatus, now, adminID, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return errRoleRequestAlreadyResolved
	}

	if approve {
		if _, err := tx.Exec(`UPDATE users SET role = ? WHERE id = ?`, role, userID); err != nil {
			return err
		}
	}
	return tx.Commit()
}
