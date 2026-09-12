package main

import (
	"database/sql"
	"fmt"
)

func validExchangeRateSnapshot(s exchangeRateSnapshot) bool {
	if !isPositiveFinite(s.USD.Amount) || !isPositiveFinite(s.USD.Rate) {
		return false
	}
	if !isPositiveFinite(s.RUB.Amount) || !isPositiveFinite(s.RUB.Rate) {
		return false
	}
	if s.PublishedAt.IsZero() || s.UpdatedAt.IsZero() {
		return false
	}
	if s.UpdatedAt.Before(s.PublishedAt) {
		return false
	}
	return true
}

func loadExchangeRateSnapshot() (exchangeRateSnapshot, bool, error) {
	var s exchangeRateSnapshot
	err := db.QueryRow(`SELECT usd_amount, usd_rate, rub_amount, rub_rate, published_at, updated_at
		FROM exchange_rate_snapshot WHERE id = 1`).
		Scan(&s.USD.Amount, &s.USD.Rate, &s.RUB.Amount, &s.RUB.Rate, &s.PublishedAt, &s.UpdatedAt)
	if err == sql.ErrNoRows {
		return exchangeRateSnapshot{}, false, nil
	}
	if err != nil {
		return exchangeRateSnapshot{}, false, err
	}
	if !validExchangeRateSnapshot(s) {
		return exchangeRateSnapshot{}, false, fmt.Errorf("exchange rate snapshot: corrupted stored record")
	}
	return s, true, nil
}

func saveExchangeRateSnapshot(s exchangeRateSnapshot) error {
	if !validExchangeRateSnapshot(s) {
		return fmt.Errorf("exchange rate snapshot: refusing to save an invalid snapshot")
	}
	_, err := db.Exec(`
		INSERT INTO exchange_rate_snapshot(id, usd_amount, usd_rate, rub_amount, rub_rate, published_at, updated_at)
		VALUES (1, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			usd_amount = excluded.usd_amount,
			usd_rate = excluded.usd_rate,
			rub_amount = excluded.rub_amount,
			rub_rate = excluded.rub_rate,
			published_at = excluded.published_at,
			updated_at = excluded.updated_at`,
		s.USD.Amount, s.USD.Rate, s.RUB.Amount, s.RUB.Rate, s.PublishedAt, s.UpdatedAt)
	return err
}
