package main

import (
	"net/http"
	"net/url"
	"time"

	"github.com/gorilla/websocket"
)

var realtimeTickets = newRealtimeTicketStore()

func handleIssueRealtimeTicket(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	ticket, err := realtimeTickets.issue(u.ID, time.Now())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "ticket error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ticket": ticket, "expiresIn": int(realtimeTicketTTL.Seconds())})
}

var realtimeUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func handleRealtimeUpgrade(w http.ResponseWriter, r *http.Request) {
	if !realtimeOriginAllowed(r.Header.Get("Origin")) {
		writeErr(w, http.StatusForbidden, "origin not allowed")
		return
	}
	userID, ok := realtimeTickets.consume(r.URL.Query().Get("ticket"), time.Now())
	if !ok {
		writeErr(w, http.StatusUnauthorized, "invalid ticket")
		return
	}

	ws, err := realtimeUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	c := newRealtimeConn(realtimeHubInstance, ws, userID)
	realtimeHubInstance.register(userID, c)
	go c.writePump()
	c.sendEvent("realtime.ready", map[string]bool{"ok": true})
	c.readPump()
}

func realtimeOriginAllowed(origin string) bool {
	if origin == "" {
		return false
	}
	for _, o := range parseOrigins(corsOrigin) {
		if o != "*" && o == origin {
			return true
		}
	}
	if !devMode {
		return false
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	return u.Hostname() == "localhost" || u.Hostname() == "127.0.0.1"
}
