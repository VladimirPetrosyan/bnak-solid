package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"
)

// Панель администратора: полный обзор жалоб/пользователей/объявлений, модерация и
// принудительное управление статусом объявлений. Доступ никак не связан с обычными
// пользователями (`users`/`sessions`) — только через отдельный логин/пароль администратора,
// см. admin_auth.go.

// adminUserOut добавляет к User поля, которых нет в основной таблице пользователей,
// но нужны панели администратора: онлайн ли пользователь прямо сейчас (по наличию
// живого realtime-соединения в хабе, см. realtime_hub.go).
type adminUserOut struct {
	User
	Online        bool `json:"online"`
	UnreadSupport int  `json:"unreadSupport"`
}

func unreadSupportByUser() map[string]int {
	rows, err := db.Query(`SELECT st.user_id, COUNT(*) FROM support_messages sm
		JOIN support_threads st ON st.id = sm.thread_id
		WHERE sm.sender = 'user' AND sm.read_at IS NULL
		GROUP BY st.user_id`)
	if err != nil {
		return map[string]int{}
	}
	defer rows.Close()
	m := map[string]int{}
	for rows.Next() {
		var id string
		var n int
		if rows.Scan(&id, &n) == nil {
			m[id] = n
		}
	}
	return m
}

// loadOwnerSummaryAdmin — в отличие от публичного loadOwnerSummary, панели
// администратора можно показать и телефон владельца — это внутренний инструмент.
func loadOwnerSummaryAdmin(ownerID string) map[string]any {
	var owner User
	db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, ownerID).
		Scan(&owner.ID, &owner.Phone, &owner.Name, &owner.Role, &owner.Ini, &owner.CreatedAt)
	return map[string]any{"id": owner.ID, "name": owner.Name, "phone": owner.Phone, "ini": owner.Ini}
}

func onlineSet() map[string]bool {
	m := map[string]bool{}
	for _, id := range realtimeHubInstance.onlineUserIDs() {
		m[id] = true
	}
	return m
}

// ---------- GET /api/admin/users ----------

func scanAdminUser(scan func(dest ...any) error) (User, error) {
	var u User
	var legalAcceptedAt sql.NullTime
	err := scan(&u.ID, &u.Phone, &u.Name, &u.Role, &u.Status, &u.Ini, &u.CreatedAt, &u.LegalVersion, &legalAcceptedAt, &u.LegalLanguage)
	if err != nil {
		return u, err
	}
	if legalAcceptedAt.Valid {
		t := legalAcceptedAt.Time
		u.LegalAcceptedAt = &t
	}
	return u, nil
}

const adminUserCols = `id, phone, name, role, status, ini, created_at, legal_version, legal_accepted_at, legal_language`

func handleAdminUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`SELECT ` + adminUserCols + ` FROM users ORDER BY created_at DESC`)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	online := onlineSet()
	unread := unreadSupportByUser()
	out := []adminUserOut{}
	for rows.Next() {
		u, err := scanAdminUser(rows.Scan)
		if err == nil {
			out = append(out, adminUserOut{User: u, Online: online[u.ID], UnreadSupport: unread[u.ID]})
		}
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- GET /api/admin/users/{id} ----------

func handleAdminUserDetail(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	u, err := scanAdminUser(db.QueryRow(`SELECT `+adminUserCols+` FROM users WHERE id = ?`, id).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	rows, err := db.Query(`SELECT `+listingCols+` FROM listings WHERE owner_id = ? ORDER BY created_at DESC`, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	listings, err := drainListings(rows)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	var complaintsFiled, messagesCount int
	db.QueryRow(`SELECT COUNT(*) FROM reports WHERE reporter_id = ?`, id).Scan(&complaintsFiled)
	db.QueryRow(`SELECT COUNT(*) FROM support_messages sm JOIN support_threads st ON st.id = sm.thread_id WHERE st.user_id = ?`, id).Scan(&messagesCount)

	online := onlineSet()
	writeJSON(w, http.StatusOK, map[string]any{
		"user":            adminUserOut{User: u, Online: online[u.ID]},
		"listings":        listings,
		"complaintsFiled": complaintsFiled,
		"messagesCount":   messagesCount,
	})
}

// ---------- PUT /api/admin/users/{id} ----------

type adminUpdateUserInput struct {
	Name   string `json:"name"`
	Phone  string `json:"phone"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

func handleAdminUpdateUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in adminUpdateUserInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	name := strings.TrimSpace(in.Name)
	phone := normalizePhone(in.Phone)
	if name == "" || !validPhone(phone) {
		writeErr(w, http.StatusBadRequest, "invalid input")
		return
	}
	if !validRoles[in.Role] {
		writeErr(w, http.StatusBadRequest, "invalid role")
		return
	}
	if in.Status != "active" && in.Status != "blocked" {
		writeErr(w, http.StatusBadRequest, "invalid status")
		return
	}

	tx, err := db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback()

	var oldStatus string
	if err := tx.QueryRow(`SELECT status FROM users WHERE id = ?`, id).Scan(&oldStatus); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	var conflict string
	err = tx.QueryRow(`SELECT id FROM users WHERE phone = ? AND id != ?`, phone, id).Scan(&conflict)
	if err == nil {
		writeErr(w, http.StatusConflict, "phone_taken")
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	ini := initialsOf(name)
	if _, err := tx.Exec(`UPDATE users SET name=?, phone=?, role=?, status=?, ini=? WHERE id=?`,
		name, phone, in.Role, in.Status, ini, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if in.Status == "blocked" && oldStatus != "blocked" {
		if _, err := tx.Exec(`DELETE FROM sessions WHERE user_id = ?`, id); err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
	}
	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	u, err := scanAdminUser(db.QueryRow(`SELECT `+adminUserCols+` FROM users WHERE id = ?`, id).Scan)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, adminUserOut{User: u, Online: onlineSet()[u.ID]})
}

// ---------- DELETE /api/admin/users/{id} ----------
// Аккаунт удаляется навсегда: его объявления уходят в архив (а не удаляются — история
// сделок и жалоб на них должна остаться), тред поддержки стирается вместе с сообщениями,
// сессии обрываются.

func handleAdminDeleteUser(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tx, err := db.Begin()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback()

	var one int
	if err := tx.QueryRow(`SELECT 1 FROM users WHERE id = ?`, id).Scan(&one); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	now := time.Now()
	if _, err := tx.Exec(`UPDATE listings SET status='archived', updated_at=? WHERE owner_id=? AND status!='archived'`, now, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := tx.Exec(`DELETE FROM support_messages WHERE thread_id IN (SELECT id FROM support_threads WHERE user_id=?)`, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := tx.Exec(`DELETE FROM support_threads WHERE user_id=?`, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := tx.Exec(`DELETE FROM sessions WHERE user_id=?`, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if _, err := tx.Exec(`DELETE FROM users WHERE id=?`, id); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if err := tx.Commit(); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- GET /api/admin/online ----------

func handleAdminOnline(w http.ResponseWriter, r *http.Request) {
	ids := realtimeHubInstance.onlineUserIDs()
	var count int
	if len(ids) > 0 {
		placeholders := make([]string, len(ids))
		args := make([]any, len(ids))
		for i, id := range ids {
			placeholders[i] = "?"
			args[i] = id
		}
		db.QueryRow(`SELECT COUNT(*) FROM users WHERE id IN (`+strings.Join(placeholders, ",")+`)`, args...).Scan(&count)
	}
	writeJSON(w, http.StatusOK, map[string]int{"count": count})
}

// ---------- GET /api/admin/reports?status= ----------

func handleAdminReports(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	sqlStr := `SELECT id, listing_id, reporter_id, reason, text, status, created_at FROM reports`
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
	reports := []Report{}
	for rows.Next() {
		var rp Report
		if rows.Scan(&rp.ID, &rp.ListingID, &rp.ReporterID, &rp.Reason, &rp.Text, &rp.Status, &rp.CreatedAt) == nil {
			reports = append(reports, rp)
		}
	}
	rows.Close()

	out := []map[string]any{}
	for _, rp := range reports {
		row := db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, rp.ListingID)
		l, err := scanListing(row)
		var listingOut any
		var ownerOut any
		if err == nil {
			l.Photos = loadPhotos(l.ID)
			listingOut = l
			ownerOut = loadOwnerSummaryAdmin(l.OwnerID)
		}
		var reporter User
		db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, rp.ReporterID).
			Scan(&reporter.ID, &reporter.Phone, &reporter.Name, &reporter.Role, &reporter.Ini, &reporter.CreatedAt)
		out = append(out, map[string]any{
			"report": rp, "listing": listingOut, "owner": ownerOut,
			"reporter": map[string]any{"id": reporter.ID, "name": reporter.Name, "phone": reporter.Phone, "ini": reporter.Ini},
		})
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- POST /api/admin/reports/{id}/resolve ----------
// action=dismiss — жалоба отклонена, объявление возвращается в выдачу (если других
// ожидающих жалоб не осталось). action=uphold — жалоба подтверждена, объявление
// снимается (archived), рейтинг владельца в текущей демке отдельно не считается.

type adminResolveInput struct {
	Action string `json:"action"`
}

var (
	errReportNotFound        = errors.New("report_not_found")
	errReportAlreadyResolved = errors.New("report_already_resolved")
)

func handleAdminResolveReport(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in adminResolveInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if in.Action != "uphold" && in.Action != "dismiss" {
		writeErr(w, http.StatusBadRequest, "invalid action")
		return
	}
	err := resolveReport(id, in.Action, time.Now())
	switch {
	case errors.Is(err, errReportNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case errors.Is(err, errReportAlreadyResolved):
		writeErr(w, http.StatusConflict, "report_already_resolved")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

func resolveReport(id, action string, now time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var listingID, reporterID string
	err = tx.QueryRow(`SELECT listing_id, reporter_id FROM reports WHERE id = ?`, id).Scan(&listingID, &reporterID)
	if errors.Is(err, sql.ErrNoRows) {
		return errReportNotFound
	}
	if err != nil {
		return err
	}

	newStatus := "dismissed"
	if action == "uphold" {
		newStatus = "upheld"
	}
	res, err := tx.Exec(`UPDATE reports SET status=? WHERE id=? AND status='pending'`, newStatus, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n != 1 {
		return errReportAlreadyResolved
	}

	changed := false
	if action == "uphold" {
		var priorStatus string
		if err := tx.QueryRow(`SELECT status FROM listings WHERE id = ?`, listingID).Scan(&priorStatus); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return errListingNotFound
			}
			return err
		}
		if priorStatus != "archived" {
			res, err := tx.Exec(`UPDATE listings SET status='archived', updated_at=? WHERE id=?`, now, listingID)
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
			changed = true
		}
		used, err := monthlyUsedForKinds(tx, reporterID, now, kindUsefulReport)
		if err != nil {
			return err
		}
		if used+rewardUsefulReport <= monthlyReportCap {
			if _, err := grantTokens(tx, now, grantInput{
				userID: reporterID, amount: rewardUsefulReport, kind: kindUsefulReport, eventKey: "useful_report:" + id, listingID: &listingID,
			}); err != nil {
				return err
			}
		}
	} else {
		var pending int
		if err := tx.QueryRow(`SELECT COUNT(*) FROM reports WHERE listing_id=? AND status='pending'`, listingID).Scan(&pending); err != nil {
			return err
		}
		if pending == 0 {
			res, err := tx.Exec(`UPDATE listings SET status='active', confirmed_at=?, expires_at=?, updated_at=? WHERE id=? AND status='flagged'`,
				now, now.Add(confirmWindow), now, listingID)
			if err != nil {
				return err
			}
			if n, err := res.RowsAffected(); err == nil && n == 1 {
				changed = true
			}
		}
	}
	if err := tx.Commit(); err != nil {
		return err
	}
	if changed {
		publishListingState(listingID)
	}
	return nil
}

// ---------- GET /api/admin/listings?status= ----------

func handleAdminListings(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	sqlStr := `SELECT ` + listingCols + ` FROM listings`
	args := []any{}
	if status != "" {
		sqlStr += ` WHERE status = ?`
		args = append(args, status)
	}
	sqlStr += ` ORDER BY created_at DESC LIMIT 500`
	rows, err := db.Query(sqlStr, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	list, err := drainListings(rows)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out := []map[string]any{}
	for _, l := range list {
		l.Photos = loadPhotos(l.ID)
		l.Videos = loadVideos(l.ID)
		out = append(out, map[string]any{"listing": l, "owner": loadOwnerSummaryAdmin(l.OwnerID)})
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- POST /api/admin/listings/{id}/status ----------
// Принудительная смена статуса — например, вернуть объявление в выдачу мимо владельца
// или снять его без жалобы.

type adminListingStatusInput struct {
	Status string `json:"status"`
}

func handleAdminSetListingStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	var in adminListingStatusInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	valid := map[string]bool{"active": true, "flagged": true, "archived": true, "rented": true}
	if !valid[in.Status] {
		writeErr(w, http.StatusBadRequest, "invalid status")
		return
	}
	err := setListingStatus(id, in.Status, time.Now())
	switch {
	case errors.Is(err, errListingNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

func setListingStatus(id, status string, now time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	l, err := scanListing(tx.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, id))
	if errors.Is(err, sql.ErrNoRows) {
		return errListingNotFound
	}
	if err != nil {
		return err
	}

	if status != "active" && l.Status == status {
		return tx.Commit()
	}

	if status == "active" {
		_, err = tx.Exec(`UPDATE listings SET status=?, confirmed_at=?, expires_at=?, updated_at=? WHERE id=?`,
			status, now, now.Add(confirmWindow), now, id)
	} else {
		_, err = tx.Exec(`UPDATE listings SET status=?, updated_at=? WHERE id=?`, status, now, id)
	}
	if err != nil {
		return err
	}

	if status == "active" && l.Status == "pending" {
		if err := grantApprovalRewards(tx, l, now); err != nil {
			return err
		}
	}

	if err := tx.Commit(); err != nil {
		return err
	}
	publishListingState(id)
	return nil
}

func grantApprovalRewards(tx *sql.Tx, l *Listing, now time.Time) error {
	if _, err := grantTokens(tx, now, grantInput{
		userID: l.OwnerID, amount: rewardFirstApproved, kind: kindFirstApprovedListing,
		eventKey: "first_approved_listing:" + l.OwnerID, cap: monthlyRewardCap,
	}); err != nil {
		return err
	}

	if strings.TrimSpace(l.CadastreCode) != "" {
		if _, err := grantTokens(tx, now, grantInput{
			userID: l.OwnerID, amount: rewardCadastre, kind: kindCadastreVerified,
			eventKey: "cadastre_verified:" + l.ID, listingID: &l.ID, cap: monthlyRewardCap,
		}); err != nil {
			return err
		}
	}

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
	return nil
}

// ---------- DELETE /api/admin/listings/{id} ----------

func handleAdminDeleteListing(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if err := deleteListingAndDocument(id); err != nil {
		if errors.Is(err, errListingNotFound) {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
