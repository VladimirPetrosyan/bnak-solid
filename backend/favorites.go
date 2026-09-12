package main

import "net/http"

func handleListFavorites(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	rows, err := db.Query(`SELECT `+listingColsQ+` FROM listings l
		JOIN favorites f ON f.listing_id = l.id WHERE f.user_id = ? ORDER BY f.created_at DESC`, u.ID)
	if err != nil {
		logf("handleListFavorites query: %v", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	list, err := drainListings(rows)
	if err != nil {
		logf("handleListFavorites drain: %v", err)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	ids := make([]string, len(list))
	for i, l := range list {
		ids[i] = l.ID
	}
	views, err := viewCounts(ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	favorites, err := favoriteCounts(ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	out := []map[string]any{}
	for _, l := range list {
		l.Photos = loadPhotos(l.ID)
		out = append(out, map[string]any{"listing": l, "owner": loadOwnerSummary(l.OwnerID), "views": views[l.ID], "favorites": favorites[l.ID]})
	}
	writeJSON(w, http.StatusOK, out)
}

func handleAddFavorite(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	var ownerID string
	if err := db.QueryRow(`SELECT owner_id FROM listings WHERE id = ?`, id).Scan(&ownerID); err != nil {
		writeErr(w, http.StatusNotFound, "listing not found")
		return
	}
	res, err := db.Exec(`INSERT OR IGNORE INTO favorites(user_id, listing_id) VALUES (?, ?)`, u.ID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	added, err := res.RowsAffected()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	count, err := favoriteCount(id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "favorites": count})
	if added > 0 {
		publishListingFavorites(id, ownerID, count)
	}
}

func handleRemoveFavorite(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	res, err := db.Exec(`DELETE FROM favorites WHERE user_id = ? AND listing_id = ?`, u.ID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	removed, err := res.RowsAffected()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	count, err := favoriteCount(id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "favorites": count})
	if removed > 0 {
		var ownerID string
		db.QueryRow(`SELECT owner_id FROM listings WHERE id = ?`, id).Scan(&ownerID)
		publishListingFavorites(id, ownerID, count)
	}
}
