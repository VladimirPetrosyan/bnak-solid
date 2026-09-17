package main

import (
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"
)

const browserIDHeader = "X-Browser-Id"

const (
	minBrowserIDLen = 8
	maxBrowserIDLen = 128
)

func validBrowserID(id string) bool {
	if len(id) < minBrowserIDLen || len(id) > maxBrowserIDLen {
		return false
	}
	for _, r := range id {
		if (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '-' {
			continue
		}
		return false
	}
	return true
}

func hashViewer(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func viewerHash(userID, browserID string) (string, bool) {
	if userID != "" {
		return hashViewer("user:" + userID), true
	}
	if !validBrowserID(browserID) {
		return "", false
	}
	return hashViewer("browser:" + browserID), true
}

func recordListingView(listingID, ownerID, requesterID, browserID string) error {
	_, err := recordListingViewResult(listingID, ownerID, requesterID, browserID)
	return err
}

func recordListingViewResult(listingID, ownerID, requesterID, browserID string) (bool, error) {
	if requesterID != "" && requesterID == ownerID {
		return false, nil
	}
	hash, ok := viewerHash(requesterID, browserID)
	if !ok {
		return false, nil
	}
	res, err := db.Exec(`INSERT OR IGNORE INTO listing_views(listing_id, viewer_hash) VALUES (?, ?)`, listingID, hash)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func viewCount(listingID string) (int, error) {
	var n int
	err := db.QueryRow(`SELECT COUNT(*) FROM listing_views WHERE listing_id = ?`, listingID).Scan(&n)
	return n, err
}

func favoriteCount(listingID string) (int, error) {
	var n int
	err := db.QueryRow(`SELECT COUNT(*) FROM favorites WHERE listing_id = ?`, listingID).Scan(&n)
	return n, err
}

func batchCounts(table string, listingIDs []string) (map[string]int, error) {
	out := map[string]int{}
	if len(listingIDs) == 0 {
		return out, nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(listingIDs)), ",")
	args := make([]any, len(listingIDs))
	for i, id := range listingIDs {
		args[i] = id
	}
	rows, err := db.Query(`SELECT listing_id, COUNT(*) FROM `+table+` WHERE listing_id IN (`+placeholders+`) GROUP BY listing_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var n int
		if err := rows.Scan(&id, &n); err != nil {
			return nil, err
		}
		out[id] = n
	}
	return out, rows.Err()
}

func viewCounts(listingIDs []string) (map[string]int, error) {
	return batchCounts("listing_views", listingIDs)
}

func favoriteCounts(listingIDs []string) (map[string]int, error) {
	return batchCounts("favorites", listingIDs)
}

// complaintCounts считает жалобы «уже сдана» за последние since..now, которые
// модерация не отклонила (pending или upheld) — отклонённые (dismissed) не должны
// портить репутацию продавца.
func complaintCounts(listingIDs []string, since time.Time) (map[string]int, error) {
	out := map[string]int{}
	if len(listingIDs) == 0 {
		return out, nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(listingIDs)), ",")
	args := make([]any, 0, len(listingIDs)+1)
	args = append(args, since)
	for _, id := range listingIDs {
		args = append(args, id)
	}
	rows, err := db.Query(`SELECT listing_id, COUNT(*) FROM reports WHERE status != 'dismissed' AND created_at >= ? AND listing_id IN (`+placeholders+`) GROUP BY listing_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var n int
		if err := rows.Scan(&id, &n); err != nil {
			return nil, err
		}
		out[id] = n
	}
	return out, rows.Err()
}
