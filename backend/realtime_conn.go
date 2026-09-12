package main

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	realtimeWriteWait   = 10 * time.Second
	realtimeReadWait    = 60 * time.Second
	realtimePingPeriod  = realtimeReadWait * 9 / 10
	realtimeMaxMessage  = 4096
	realtimeSendBufSize = 32
)

type realtimeConn struct {
	hub      *realtimeHub
	ws       *websocket.Conn
	userID   string
	send     chan []byte
	closed   chan struct{}
	once     sync.Once
	watching string
}

func newRealtimeConn(hub *realtimeHub, ws *websocket.Conn, userID string) *realtimeConn {
	return &realtimeConn{
		hub:    hub,
		ws:     ws,
		userID: userID,
		send:   make(chan []byte, realtimeSendBufSize),
		closed: make(chan struct{}),
	}
}

func (c *realtimeConn) enqueue(raw []byte) {
	select {
	case c.send <- raw:
	case <-c.closed:
	default:
		c.close()
	}
}

func (c *realtimeConn) sendEvent(eventType string, data any) {
	raw, err := json.Marshal(realtimeEnvelope{Type: eventType, Data: data})
	if err != nil {
		return
	}
	c.enqueue(raw)
}

func (c *realtimeConn) close() {
	c.once.Do(func() {
		close(c.closed)
		c.hub.unregister(c.userID, c)
		c.ws.Close()
	})
}

func (c *realtimeConn) writePump() {
	ticker := time.NewTicker(realtimePingPeriod)
	defer func() {
		ticker.Stop()
		c.close()
	}()
	for {
		select {
		case raw := <-c.send:
			c.ws.SetWriteDeadline(time.Now().Add(realtimeWriteWait))
			if err := c.ws.WriteMessage(websocket.TextMessage, raw); err != nil {
				return
			}
		case <-ticker.C:
			c.ws.SetWriteDeadline(time.Now().Add(realtimeWriteWait))
			if err := c.ws.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		case <-c.closed:
			return
		}
	}
}

func (c *realtimeConn) readPump() {
	defer c.close()
	c.ws.SetReadLimit(realtimeMaxMessage)
	c.ws.SetReadDeadline(time.Now().Add(realtimeReadWait))
	c.ws.SetPongHandler(func(string) error {
		c.ws.SetReadDeadline(time.Now().Add(realtimeReadWait))
		return nil
	})
	for {
		_, raw, err := c.ws.ReadMessage()
		if err != nil {
			return
		}
		c.handleIncoming(raw)
	}
}
