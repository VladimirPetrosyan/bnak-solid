package main

import (
	"context"
	"time"
)

const exchangeRatesRefreshInterval = time.Hour
const exchangeRatesFetchTimeout = 10 * time.Second

func startExchangeRatesRefresher() {
	go func() {
		refreshExchangeRates()
		t := time.NewTicker(exchangeRatesRefreshInterval)
		defer t.Stop()
		for range t.C {
			refreshExchangeRates()
		}
	}()
}

func refreshExchangeRates() {
	ctx, cancel := context.WithTimeout(context.Background(), exchangeRatesFetchTimeout)
	defer cancel()

	fetched, err := fetchCBAExchangeRates(ctx)
	if err != nil {
		logf("exchange rates: fetch failed: %v", err)
		return
	}

	current, hasCurrent, err := loadExchangeRateSnapshot()
	if err != nil {
		logf("exchange rates: load current failed: %v", err)
		return
	}
	if hasCurrent && !exchangeRatesChanged(current, fetched) {
		return
	}

	fetched.UpdatedAt = time.Now().UTC()
	if err := saveExchangeRateSnapshot(fetched); err != nil {
		logf("exchange rates: save failed: %v", err)
		return
	}

	broadcastExchangeRatesUpdated(fetched)
}

func exchangeRatesChanged(current, fetched exchangeRateSnapshot) bool {
	return current.USD != fetched.USD || current.RUB != fetched.RUB || !current.PublishedAt.Equal(fetched.PublishedAt)
}

func broadcastExchangeRatesUpdated(s exchangeRateSnapshot) {
	realtimeHubInstance.broadcastAll("exchange_rates.updated", exchangeRateSnapshotJSON(s))
}
