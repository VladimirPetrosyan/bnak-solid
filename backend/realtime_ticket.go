package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"sync"
	"time"
)

const realtimeTicketTTL = 30 * time.Second

type realtimeTicket struct {
	userID    string
	expiresAt time.Time
}

type realtimeTicketStore struct {
	mu      sync.Mutex
	tickets map[string]realtimeTicket
}

func newRealtimeTicketStore() *realtimeTicketStore {
	return &realtimeTicketStore{tickets: map[string]realtimeTicket{}}
}

func (s *realtimeTicketStore) issue(userID string, now time.Time) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	token := hex.EncodeToString(raw)

	s.mu.Lock()
	defer s.mu.Unlock()
	s.sweepLocked(now)
	s.tickets[hashTicket(token)] = realtimeTicket{userID: userID, expiresAt: now.Add(realtimeTicketTTL)}
	return token, nil
}

func (s *realtimeTicketStore) consume(token string, now time.Time) (string, bool) {
	if token == "" {
		return "", false
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sweepLocked(now)
	t, ok := s.tickets[hashTicket(token)]
	if !ok {
		return "", false
	}
	delete(s.tickets, hashTicket(token))
	if !now.Before(t.expiresAt) {
		return "", false
	}
	return t.userID, true
}

func (s *realtimeTicketStore) sweepLocked(now time.Time) {
	for h, t := range s.tickets {
		if !now.Before(t.expiresAt) {
			delete(s.tickets, h)
		}
	}
}

func hashTicket(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
