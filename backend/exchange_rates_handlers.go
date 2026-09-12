package main

import (
	"net/http"
	"time"
)

type exchangeRateAmountJSON struct {
	Amount float64 `json:"amount"`
	Rate   float64 `json:"rate"`
}

type exchangeRateSnapshotResponse struct {
	USD         exchangeRateAmountJSON `json:"usd"`
	RUB         exchangeRateAmountJSON `json:"rub"`
	PublishedAt time.Time              `json:"publishedAt"`
	UpdatedAt   time.Time              `json:"updatedAt"`
}

func exchangeRateSnapshotJSON(s exchangeRateSnapshot) exchangeRateSnapshotResponse {
	return exchangeRateSnapshotResponse{
		USD:         exchangeRateAmountJSON{Amount: s.USD.Amount, Rate: s.USD.Rate},
		RUB:         exchangeRateAmountJSON{Amount: s.RUB.Amount, Rate: s.RUB.Rate},
		PublishedAt: s.PublishedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}

func handleGetExchangeRates(w http.ResponseWriter, r *http.Request) {
	snapshot, ok, err := loadExchangeRateSnapshot()
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "exchange rates unavailable")
		return
	}
	if !ok {
		writeErr(w, http.StatusServiceUnavailable, "exchange rates not available yet")
		return
	}
	writeJSON(w, http.StatusOK, exchangeRateSnapshotJSON(snapshot))
}
