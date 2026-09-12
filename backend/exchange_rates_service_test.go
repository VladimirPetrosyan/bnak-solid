package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func cbaTestServer(t *testing.T, currentDate, ratesXML string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/xml; charset=utf-8")
		w.Write([]byte(cbaSOAPResponse(currentDate, ratesXML)))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func setCBAEndpoint(t *testing.T, url string) {
	t.Helper()
	orig := cbaExchangeRatesEndpoint
	cbaExchangeRatesEndpoint = url
	t.Cleanup(func() { cbaExchangeRatesEndpoint = orig })
}

func listenExchangeRates(t *testing.T, userID string) *realtimeConn {
	t.Helper()
	c := newRealtimeConn(realtimeHubInstance, nil, userID)
	realtimeHubInstance.register(userID, c)
	t.Cleanup(func() { realtimeHubInstance.unregister(userID, c) })
	return c
}

func TestRefreshExchangeRatesSavesAndBroadcastsOnFirstFetch(t *testing.T) {
	setupTestDB(t)
	setCBAEndpoint(t, cbaTestServer(t, "2026-08-24T00:00:00", validCBARates).URL)
	conn := listenExchangeRates(t, "listener-first-fetch")

	refreshExchangeRates()

	snapshot, ok, err := loadExchangeRateSnapshot()
	if err != nil || !ok {
		t.Fatalf("load: ok=%v err=%v", ok, err)
	}
	if snapshot.USD.Rate != 365.38 || snapshot.RUB.Rate != 4.3633 {
		t.Fatalf("unexpected snapshot: %+v", snapshot)
	}

	select {
	case raw := <-conn.send:
		var env realtimeEnvelope
		if err := json.Unmarshal(raw, &env); err != nil {
			t.Fatalf("decode event: %v", err)
		}
		if env.Type != "exchange_rates.updated" {
			t.Fatalf("want exchange_rates.updated, got %q", env.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("expected a broadcast event on first successful fetch")
	}
}

func TestRefreshExchangeRatesKeepsLastGoodSnapshotOnFetchError(t *testing.T) {
	setupTestDB(t)
	good := testSnapshot()
	if err := saveExchangeRateSnapshot(good); err != nil {
		t.Fatalf("seed snapshot: %v", err)
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	setCBAEndpoint(t, srv.URL)
	conn := listenExchangeRates(t, "listener-fetch-error")

	refreshExchangeRates()

	got, ok, err := loadExchangeRateSnapshot()
	if err != nil || !ok {
		t.Fatalf("load: ok=%v err=%v", ok, err)
	}
	if got.USD != good.USD || got.RUB != good.RUB {
		t.Fatalf("fetch error must not touch the last good snapshot: got %+v", got)
	}

	select {
	case <-conn.send:
		t.Fatal("must not broadcast when the fetch failed")
	case <-time.After(200 * time.Millisecond):
	}
}

func TestRefreshExchangeRatesChangedOnlyIgnoresIdenticalRates(t *testing.T) {
	setupTestDB(t)
	existing := testSnapshot()
	if err := saveExchangeRateSnapshot(existing); err != nil {
		t.Fatalf("seed snapshot: %v", err)
	}
	setCBAEndpoint(t, cbaTestServer(t, "2026-08-24T00:00:00", validCBARates).URL)
	conn := listenExchangeRates(t, "listener-unchanged")

	refreshExchangeRates()

	got, _, err := loadExchangeRateSnapshot()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if !got.UpdatedAt.Equal(existing.UpdatedAt) {
		t.Fatalf("identical USD/RUB/publishedAt must not rewrite updatedAt: got %v, want %v", got.UpdatedAt, existing.UpdatedAt)
	}

	select {
	case <-conn.send:
		t.Fatal("must not broadcast when USD/RUB/publishedAt are unchanged")
	case <-time.After(200 * time.Millisecond):
	}
}

func TestRefreshExchangeRatesBroadcastsWhenRatesChange(t *testing.T) {
	setupTestDB(t)
	existing := testSnapshot()
	if err := saveExchangeRateSnapshot(existing); err != nil {
		t.Fatalf("seed snapshot: %v", err)
	}
	changedRates := cbaRateXML("USD", "1", "370.00") + cbaRateXML("RUB", "1", "4.40")
	setCBAEndpoint(t, cbaTestServer(t, "2026-08-24T00:00:00", changedRates).URL)
	conn := listenExchangeRates(t, "listener-changed")

	refreshExchangeRates()

	got, _, err := loadExchangeRateSnapshot()
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if got.USD.Rate != 370.00 || got.RUB.Rate != 4.40 {
		t.Fatalf("rates were not updated: %+v", got)
	}

	select {
	case raw := <-conn.send:
		var env realtimeEnvelope
		if err := json.Unmarshal(raw, &env); err != nil {
			t.Fatalf("decode event: %v", err)
		}
		if env.Type != "exchange_rates.updated" {
			t.Fatalf("want exchange_rates.updated, got %q", env.Type)
		}
	case <-time.After(time.Second):
		t.Fatal("expected a broadcast event when rates changed")
	}
}

func TestRefreshExchangeRatesDoesNotBroadcastOnSaveFailure(t *testing.T) {
	setupTestDB(t)
	setCBAEndpoint(t, cbaTestServer(t, "2026-08-24T00:00:00", validCBARates).URL)
	if _, err := db.Exec(`CREATE TRIGGER block_exrate_insert BEFORE INSERT ON exchange_rate_snapshot
		BEGIN SELECT RAISE(ABORT, 'blocked for test'); END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}
	conn := listenExchangeRates(t, "listener-save-error")

	refreshExchangeRates()

	select {
	case <-conn.send:
		t.Fatal("must not broadcast when the write to the database failed")
	case <-time.After(200 * time.Millisecond):
	}

	if _, ok, err := loadExchangeRateSnapshot(); err != nil || ok {
		t.Fatalf("a failed write must not leave a snapshot behind: ok=%v err=%v", ok, err)
	}
}

func TestHandleGetExchangeRatesReturns503WithoutSnapshot(t *testing.T) {
	setupTestDB(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/exchange-rates", nil)
	handleGetExchangeRates(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("want 503, got %d", rec.Code)
	}
}

func TestHandleGetExchangeRatesRejectsCorruptedStoredSnapshot(t *testing.T) {
	setupTestDB(t)
	corrupted := testSnapshot()
	corrupted.UpdatedAt = corrupted.PublishedAt.Add(-time.Hour)
	insertRawExchangeRateSnapshot(t, corrupted)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/exchange-rates", nil)
	handleGetExchangeRates(rec, req)
	if rec.Code == http.StatusOK {
		t.Fatalf("must not return 200 for a corrupted stored snapshot, got body %s", rec.Body.String())
	}
}

func TestHandleGetExchangeRatesReturnsLatestSnapshot(t *testing.T) {
	setupTestDB(t)
	want := testSnapshot()
	if err := saveExchangeRateSnapshot(want); err != nil {
		t.Fatalf("seed snapshot: %v", err)
	}
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/exchange-rates", nil)
	handleGetExchangeRates(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("want 200, got %d", rec.Code)
	}
	var body exchangeRateSnapshotResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.USD.Rate != want.USD.Rate || body.RUB.Rate != want.RUB.Rate {
		t.Fatalf("unexpected body: %+v", body)
	}
}
