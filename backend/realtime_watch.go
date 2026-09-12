package main

import "encoding/json"

type realtimeIncoming struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type listingWatchData struct {
	ListingID string `json:"listingId"`
}

func (c *realtimeConn) handleIncoming(raw []byte) {
	var msg realtimeIncoming
	if err := json.Unmarshal(raw, &msg); err != nil {
		return
	}
	if msg.Type != "listing.watch" {
		return
	}
	var data listingWatchData
	if len(msg.Data) > 0 {
		if err := json.Unmarshal(msg.Data, &data); err != nil {
			return
		}
	}
	if data.ListingID == "" {
		c.hub.setListingWatch(c, "")
		return
	}
	if !canWatchListing(data.ListingID, c.userID) {
		return
	}
	c.hub.setListingWatch(c, data.ListingID)
}

func canWatchListing(listingID, requesterID string) bool {
	var status, ownerID string
	if err := db.QueryRow(`SELECT status, owner_id FROM listings WHERE id = ?`, listingID).Scan(&status, &ownerID); err != nil {
		return false
	}
	return status == "active" || (requesterID != "" && requesterID == ownerID)
}

func listingIsActive(listingID string) bool {
	var status string
	if err := db.QueryRow(`SELECT status FROM listings WHERE id = ?`, listingID).Scan(&status); err != nil {
		return false
	}
	return status == "active"
}
