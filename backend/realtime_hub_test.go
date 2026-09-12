package main

import "testing"

func TestBroadcastAllDedupesConnRegisteredUnderMultipleKeys(t *testing.T) {
	hub := newRealtimeHub()
	conn := newRealtimeConn(hub, nil, "user-a")
	hub.register("user-a", conn)
	hub.register("user-b", conn)

	hub.broadcastAll("exchange_rates.updated", map[string]string{"x": "y"})

	select {
	case <-conn.send:
	default:
		t.Fatal("want exactly one broadcast event")
	}

	select {
	case raw := <-conn.send:
		t.Fatalf("want exactly one broadcast event, got a second: %s", raw)
	default:
	}
}
