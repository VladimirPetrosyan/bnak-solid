package main

import (
	"testing"
	"time"
)

func seedMonthlyUsage(t *testing.T, userID, kind string, amount int, createdAt time.Time) {
	t.Helper()
	_, err := db.Exec(`INSERT INTO token_transactions(user_id, amount, kind, event_key, created_at) VALUES (?, ?, ?, ?, ?)`,
		userID, amount, kind, newID(), createdAt)
	if err != nil {
		t.Fatalf("seed usage: %v", err)
	}
	mustSetBalance(t, userID, amount)
}

func TestMonthlyCapBlocksFullRewardAtBoundary(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	now := time.Now().UTC()
	seedMonthlyUsage(t, owner, kindCadastreVerified, 145, now)

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	granted, err := grantTokens(tx, now, grantInput{userID: owner, amount: 10, kind: kindQualityPhotos, eventKey: "over-cap", cap: monthlyRewardCap})
	if err != nil {
		t.Fatalf("grantTokens: %v", err)
	}
	if granted {
		t.Fatalf("want reward skipped over cap")
	}
	granted, err = grantTokens(tx, now, grantInput{userID: owner, amount: 5, kind: kindQualityPhotos, eventKey: "at-cap", cap: monthlyRewardCap})
	if err != nil {
		t.Fatalf("grantTokens: %v", err)
	}
	if !granted {
		t.Fatalf("want reward granted exactly at cap")
	}
	tx.Commit()

	balance, _ := tokenBalance(db, owner)
	if balance != 145+5 {
		t.Fatalf("balance = %d, want %d", balance, 150)
	}
}

func TestMonthlyCapExcludesSignupAndProfile(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	now := time.Now().UTC()
	seedMonthlyUsage(t, owner, kindFirstApprovedListing, 150, now)

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	if _, err := grantTokens(tx, now, grantInput{userID: owner, amount: rewardSignup, kind: kindSignup, eventKey: "signup:" + owner}); err != nil {
		t.Fatalf("grantTokens signup: %v", err)
	}
	if _, err := grantTokens(tx, now, grantInput{userID: owner, amount: rewardProfile, kind: kindProfileComplete, eventKey: "profile_complete:" + owner}); err != nil {
		t.Fatalf("grantTokens profile: %v", err)
	}
	tx.Commit()

	balance, _ := tokenBalance(db, owner)
	if balance != 150+rewardSignup+rewardProfile {
		t.Fatalf("balance = %d, want %d", balance, 150+rewardSignup+rewardProfile)
	}
}

func TestMonthlyCapIsPerCalendarMonthUTC(t *testing.T) {
	setupTestDB(t)
	owner := mustCreateUser(t, "owner")
	now := time.Now().UTC()
	lastMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -1)
	seedMonthlyUsage(t, owner, kindFirstApprovedListing, 150, lastMonth)

	tx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin: %v", err)
	}
	granted, err := grantTokens(tx, now, grantInput{userID: owner, amount: 10, kind: kindQualityPhotos, eventKey: "this-month", cap: monthlyRewardCap})
	if err != nil {
		t.Fatalf("grantTokens: %v", err)
	}
	if !granted {
		t.Fatalf("want reward granted, previous month usage should not count")
	}
	tx.Commit()

	balance, _ := tokenBalance(db, owner)
	if balance != 150+10 {
		t.Fatalf("balance = %d, want %d", balance, 160)
	}
}
