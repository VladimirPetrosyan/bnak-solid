package main

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	msqlite "modernc.org/sqlite"
)

const vipCost = 100
const vipDays = 7

const (
	kindSignup               = "signup"
	kindProfileComplete      = "profile_complete"
	kindFirstApprovedListing = "first_approved_listing"
	kindCadastreVerified     = "cadastre_verified"
	kindQualityPhotos        = "quality_photos"
	kindMarkTaken            = "mark_taken"
	kindUsefulReport         = "useful_report"
)

const (
	rewardSignup        = 10
	rewardProfile       = 10
	rewardFirstApproved = 40
	rewardCadastre      = 25
	rewardQualityPhotos = 10
	rewardMarkTaken     = 10
	rewardUsefulReport  = 5
	monthlyRewardCap    = 150
	monthlyReportCap    = 15
)

var (
	errListingNotFound    = errors.New("listing not found")
	errNotOwner           = errors.New("not your listing")
	errListingNotActive   = errors.New("listing_not_active")
	errVipActive          = errors.New("vip_active")
	errTokensInsufficient = errors.New("tokens_insufficient")
)

type grantInput struct {
	userID    string
	amount    int
	kind      string
	eventKey  string
	listingID *string
	cap       int
}

func monthlyUsedForKinds(tx *sql.Tx, userID string, now time.Time, kinds ...string) (int, error) {
	monthStart := time.Date(now.UTC().Year(), now.UTC().Month(), 1, 0, 0, 0, 0, time.UTC)
	placeholders := make([]string, len(kinds))
	args := make([]any, 0, len(kinds)+2)
	args = append(args, userID)
	for i, k := range kinds {
		placeholders[i] = "?"
		args = append(args, k)
	}
	args = append(args, monthStart)
	query := `SELECT COALESCE(SUM(amount), 0) FROM token_transactions
		WHERE user_id = ? AND amount > 0 AND kind IN (` + strings.Join(placeholders, ",") + `) AND created_at >= ?`
	var used int
	err := tx.QueryRow(query, args...).Scan(&used)
	return used, err
}

func grantTokens(tx *sql.Tx, now time.Time, g grantInput) (bool, error) {
	if g.cap > 0 && g.amount > 0 {
		used, err := monthlyUsedForKinds(tx, g.userID, now, kindFirstApprovedListing, kindCadastreVerified, kindQualityPhotos)
		if err != nil {
			return false, err
		}
		if used+g.amount > g.cap {
			return false, nil
		}
	}

	res, err := tx.Exec(`INSERT INTO token_transactions(user_id, amount, kind, event_key, listing_id) VALUES (?, ?, ?, ?, ?)
		ON CONFLICT(event_key) DO NOTHING`, g.userID, g.amount, g.kind, g.eventKey, g.listingID)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	if n == 0 {
		return false, nil
	}
	if _, err := tx.Exec(`INSERT INTO token_balances(user_id, balance) VALUES (?, ?)
		ON CONFLICT(user_id) DO UPDATE SET balance = balance + excluded.balance`, g.userID, g.amount); err != nil {
		return false, err
	}
	return true, nil
}

func handleGetTokens(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	balance, err := tokenBalance(db, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	txs, err := recentTokenTransactions(u.ID, 50)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"balance":      balance,
		"vipCost":      vipCost,
		"vipDays":      vipDays,
		"transactions": txs,
	})
}

func handlePromoteListing(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	balance, promotedUntil, err := promoteListing(u.ID, id, time.Now())
	switch {
	case errors.Is(err, errListingNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case errors.Is(err, errNotOwner):
		writeErr(w, http.StatusForbidden, "not your listing")
	case errors.Is(err, errListingNotActive):
		writeErr(w, http.StatusConflict, "listing_not_active")
	case errors.Is(err, errVipActive):
		writeErr(w, http.StatusConflict, "vip_active")
	case errors.Is(err, errTokensInsufficient):
		writeErr(w, http.StatusConflict, "tokens_insufficient")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"balance": balance, "promotedUntil": promotedUntil})
	}
}

type queryRower interface {
	QueryRow(query string, args ...any) *sql.Row
}

func tokenBalance(q queryRower, userID string) (int, error) {
	var balance int
	err := q.QueryRow(`SELECT balance FROM token_balances WHERE user_id = ?`, userID).Scan(&balance)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return balance, err
}

func recentTokenTransactions(userID string, limit int) ([]TokenTransaction, error) {
	rows, err := db.Query(`SELECT id, user_id, amount, kind, event_key, listing_id, created_at
		FROM token_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TokenTransaction{}
	for rows.Next() {
		var t TokenTransaction
		var listingID sql.NullString
		if err := rows.Scan(&t.ID, &t.UserID, &t.Amount, &t.Kind, &t.EventKey, &listingID, &t.CreatedAt); err != nil {
			return nil, err
		}
		if listingID.Valid {
			t.ListingID = &listingID.String
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func promoteListing(userID, listingID string, now time.Time) (int, time.Time, error) {
	tx, err := db.Begin()
	if err != nil {
		return 0, time.Time{}, err
	}
	defer tx.Rollback()

	l, err := scanListing(tx.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, listingID))
	if errors.Is(err, sql.ErrNoRows) {
		return 0, time.Time{}, errListingNotFound
	}
	if err != nil {
		return 0, time.Time{}, err
	}
	if l.OwnerID != userID {
		return 0, time.Time{}, errNotOwner
	}
	if l.Status != "active" {
		return 0, time.Time{}, errListingNotActive
	}
	if l.PromotedUntil != nil && l.PromotedUntil.After(now) {
		return 0, time.Time{}, errVipActive
	}

	balance, err := tokenBalance(tx, userID)
	if err != nil {
		return 0, time.Time{}, err
	}
	if balance < vipCost {
		return 0, time.Time{}, errTokensInsufficient
	}
	newBalance := balance - vipCost

	prevPromoted := "none"
	if l.PromotedUntil != nil {
		prevPromoted = l.PromotedUntil.UTC().Format(time.RFC3339Nano)
	}
	eventKey := "vip_promote:" + listingID + ":" + prevPromoted

	if _, err := tx.Exec(`INSERT INTO token_balances(user_id, balance) VALUES (?, ?)
		ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance`, userID, newBalance); err != nil {
		return 0, time.Time{}, err
	}
	if _, err := tx.Exec(`INSERT INTO token_transactions(user_id, amount, kind, event_key, listing_id) VALUES (?, ?, 'vip_promote', ?, ?)`,
		userID, -vipCost, eventKey, listingID); err != nil {
		if isUniqueViolation(err) {
			return 0, time.Time{}, errVipActive
		}
		return 0, time.Time{}, err
	}

	promotedUntil := now.UTC().Add(vipDays * 24 * time.Hour)
	if _, err := tx.Exec(`UPDATE listings SET promoted_until = ?, updated_at = ? WHERE id = ?`,
		promotedUntil, now, listingID); err != nil {
		return 0, time.Time{}, err
	}

	if err := tx.Commit(); err != nil {
		return 0, time.Time{}, err
	}
	return newBalance, promotedUntil, nil
}

func isUniqueViolation(err error) bool {
	var se *msqlite.Error
	if errors.As(err, &se) {
		return se.Code()&0xff == 19
	}
	return false
}
