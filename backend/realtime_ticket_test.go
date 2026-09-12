package main

import (
	"sync"
	"testing"
	"time"
)

func TestTicketConsumeOnce(t *testing.T) {
	s := newRealtimeTicketStore()
	now := time.Now()
	ticket, err := s.issue("u1", now)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	userID, ok := s.consume(ticket, now)
	if !ok || userID != "u1" {
		t.Fatalf("first consume: ok=%v userID=%q", ok, userID)
	}
	if _, ok := s.consume(ticket, now); ok {
		t.Fatalf("replayed ticket must not be consumable again")
	}
}

func TestTicketExpiry(t *testing.T) {
	s := newRealtimeTicketStore()
	now := time.Now()
	ticket, err := s.issue("u1", now)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, ok := s.consume(ticket, now.Add(realtimeTicketTTL+time.Second)); ok {
		t.Fatalf("expired ticket must not be consumable")
	}
}

func TestTicketExpiryAtExactBoundaryIsRejected(t *testing.T) {
	s := newRealtimeTicketStore()
	now := time.Now()
	ticket, err := s.issue("u1", now)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, ok := s.consume(ticket, now.Add(realtimeTicketTTL)); ok {
		t.Fatalf("ticket at exact expiresAt must not be consumable")
	}
}

func TestTicketEmptyAndUnknownRejected(t *testing.T) {
	s := newRealtimeTicketStore()
	now := time.Now()
	if _, ok := s.consume("", now); ok {
		t.Fatalf("empty ticket must not be consumable")
	}
	if _, ok := s.consume("does-not-exist", now); ok {
		t.Fatalf("unknown ticket must not be consumable")
	}
}

func TestTicketParallelConsumeExactlyOneWinner(t *testing.T) {
	s := newRealtimeTicketStore()
	now := time.Now()
	ticket, err := s.issue("u1", now)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}

	const n = 20
	var wg sync.WaitGroup
	results := make([]bool, n)
	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, ok := s.consume(ticket, now)
			results[i] = ok
		}(i)
	}
	wg.Wait()

	wins := 0
	for _, ok := range results {
		if ok {
			wins++
		}
	}
	if wins != 1 {
		t.Fatalf("want exactly 1 winner, got %d", wins)
	}
}

func TestTicketIssueSweepsExpiredEntries(t *testing.T) {
	s := newRealtimeTicketStore()
	now := time.Now()
	if _, err := s.issue("u1", now); err != nil {
		t.Fatalf("issue: %v", err)
	}
	if _, err := s.issue("u2", now.Add(realtimeTicketTTL+time.Second)); err != nil {
		t.Fatalf("issue: %v", err)
	}
	s.mu.Lock()
	n := len(s.tickets)
	s.mu.Unlock()
	if n != 1 {
		t.Fatalf("want expired ticket swept on next issue, got %d tickets left", n)
	}
}
