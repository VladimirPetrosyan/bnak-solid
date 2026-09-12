package main

import (
	"encoding/json"
	"log"
	"sync"
)

type realtimeEnvelope struct {
	Type string `json:"type"`
	Data any    `json:"data"`
}

type realtimeHub struct {
	mu              sync.Mutex
	conns           map[string]map[*realtimeConn]struct{}
	listingWatchers map[string]map[*realtimeConn]struct{}
}

func newRealtimeHub() *realtimeHub {
	return &realtimeHub{
		conns:           map[string]map[*realtimeConn]struct{}{},
		listingWatchers: map[string]map[*realtimeConn]struct{}{},
	}
}

func (h *realtimeHub) register(userID string, c *realtimeConn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	set := h.conns[userID]
	if set == nil {
		set = map[*realtimeConn]struct{}{}
		h.conns[userID] = set
	}
	set[c] = struct{}{}
}

func (h *realtimeHub) unregister(userID string, c *realtimeConn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	set := h.conns[userID]
	if set != nil {
		delete(set, c)
		if len(set) == 0 {
			delete(h.conns, userID)
		}
	}
	if c.watching != "" {
		h.removeWatcherLocked(c.watching, c)
		c.watching = ""
	}
}

func (h *realtimeHub) setListingWatch(c *realtimeConn, listingID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if c.watching == listingID {
		return
	}
	if c.watching != "" {
		h.removeWatcherLocked(c.watching, c)
	}
	if listingID != "" {
		set := h.listingWatchers[listingID]
		if set == nil {
			set = map[*realtimeConn]struct{}{}
			h.listingWatchers[listingID] = set
		}
		set[c] = struct{}{}
	}
	c.watching = listingID
}

func (h *realtimeHub) removeWatcherLocked(listingID string, c *realtimeConn) {
	set := h.listingWatchers[listingID]
	if set == nil {
		return
	}
	delete(set, c)
	if len(set) == 0 {
		delete(h.listingWatchers, listingID)
	}
}

func (h *realtimeHub) onlineUserIDs() []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	ids := make([]string, 0, len(h.conns))
	for id, set := range h.conns {
		if len(set) > 0 {
			ids = append(ids, id)
		}
	}
	return ids
}

func (h *realtimeHub) sendToUser(userID string, raw []byte) {
	h.mu.Lock()
	targets := make([]*realtimeConn, 0, len(h.conns[userID]))
	for c := range h.conns[userID] {
		targets = append(targets, c)
	}
	h.mu.Unlock()

	for _, c := range targets {
		c.enqueue(raw)
	}
}

func (h *realtimeHub) publishToUsers(userIDs []string, eventType string, data any) {
	raw, err := json.Marshal(realtimeEnvelope{Type: eventType, Data: data})
	if err != nil {
		log.Println("realtime: marshal:", err)
		return
	}
	for _, id := range userIDs {
		h.sendToUser(id, raw)
	}
}

func (h *realtimeHub) publishListingState(listingID, ownerID string, active bool, data any) {
	raw, err := json.Marshal(realtimeEnvelope{Type: "listing.state", Data: data})
	if err != nil {
		log.Println("realtime: marshal:", err)
		return
	}

	h.mu.Lock()
	targets := make(map[*realtimeConn]struct{})
	for c := range h.conns[ownerID] {
		targets[c] = struct{}{}
	}
	for c := range h.listingWatchers[listingID] {
		targets[c] = struct{}{}
	}
	if !active {
		for c := range h.listingWatchers[listingID] {
			c.watching = ""
		}
		delete(h.listingWatchers, listingID)
	}
	h.mu.Unlock()

	for c := range targets {
		c.enqueue(raw)
	}
}

func (h *realtimeHub) publishListingEvent(listingID, ownerID, eventType string, data any) {
	raw, err := json.Marshal(realtimeEnvelope{Type: eventType, Data: data})
	if err != nil {
		log.Println("realtime: marshal:", err)
		return
	}
	active := listingIsActive(listingID)

	h.mu.Lock()
	targets := make(map[*realtimeConn]struct{})
	for c := range h.conns[ownerID] {
		targets[c] = struct{}{}
	}
	if active {
		for c := range h.listingWatchers[listingID] {
			targets[c] = struct{}{}
		}
	}
	h.mu.Unlock()

	for c := range targets {
		c.enqueue(raw)
	}
}

func (h *realtimeHub) broadcastAll(eventType string, data any) {
	raw, err := json.Marshal(realtimeEnvelope{Type: eventType, Data: data})
	if err != nil {
		log.Println("realtime: marshal:", err)
		return
	}

	h.mu.Lock()
	targets := make(map[*realtimeConn]struct{})
	for _, set := range h.conns {
		for c := range set {
			targets[c] = struct{}{}
		}
	}
	h.mu.Unlock()

	for c := range targets {
		c.enqueue(raw)
	}
}

var realtimeHubInstance = newRealtimeHub()
