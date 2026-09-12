package main

func publishListingState(listingID string) {
	l, err := scanListing(db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, listingID))
	if err != nil {
		logf("realtime: listing.state read failed for %s: %v", listingID, err)
		return
	}
	realtimeHubInstance.publishListingState(l.ID, l.OwnerID, l.Status == "active", map[string]any{
		"listingId":   l.ID,
		"status":      l.Status,
		"confirmedAt": l.ConfirmedAt,
		"expiresAt":   l.ExpiresAt,
		"updatedAt":   l.UpdatedAt,
	})
}

func publishListingViews(listingID, ownerID string, views int) {
	realtimeHubInstance.publishListingEvent(listingID, ownerID, "listing.stats", map[string]any{
		"listingId": listingID,
		"views":     views,
	})
}

func publishListingFavorites(listingID, ownerID string, favorites int) {
	realtimeHubInstance.publishListingEvent(listingID, ownerID, "listing.stats", map[string]any{
		"listingId": listingID,
		"favorites": favorites,
	})
}
