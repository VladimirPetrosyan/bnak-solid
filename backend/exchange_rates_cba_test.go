package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func cbaSOAPResponse(currentDate, ratesXML string) string {
	return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ExchangeRatesLatestResponse xmlns="http://www.cba.am/">
      <ExchangeRatesLatestResult>
        <CurrentDate>` + currentDate + `</CurrentDate>
        <NextAvailableDate xsi:nil="true" />
        <PreviousAvailableDate>2026-08-21T00:00:00</PreviousAvailableDate>
        <Rates>` + ratesXML + `</Rates>
      </ExchangeRatesLatestResult>
    </ExchangeRatesLatestResponse>
  </soap:Body>
</soap:Envelope>`
}

func cbaRateXML(iso, amount, rate string) string {
	return `<ExchangeRate><ISO>` + iso + `</ISO><Amount>` + amount + `</Amount><Rate>` + rate + `</Rate><Difference>0.1</Difference></ExchangeRate>`
}

const validCBARates = `
	<ExchangeRate><ISO>USD</ISO><Amount>1</Amount><Rate>365.38</Rate><Difference>0.22</Difference></ExchangeRate>
	<ExchangeRate><ISO>EUR</ISO><Amount>1</Amount><Rate>426.22</Rate><Difference>-1.09</Difference></ExchangeRate>
	<ExchangeRate><ISO>RUB</ISO><Amount>1</Amount><Rate>4.3633</Rate><Difference>-0.0078</Difference></ExchangeRate>
`

func TestParseCBAExchangeRatesRespectsAmount(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", `
		<ExchangeRate><ISO>USD</ISO><Amount>1</Amount><Rate>365.38</Rate><Difference>0.22</Difference></ExchangeRate>
		<ExchangeRate><ISO>RUB</ISO><Amount>10</Amount><Rate>43.633</Rate><Difference>-0.078</Difference></ExchangeRate>
	`)
	s, err := parseCBAExchangeRates([]byte(body))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if s.USD.Amount != 1 || s.USD.Rate != 365.38 {
		t.Fatalf("unexpected USD: %+v", s.USD)
	}
	if s.RUB.Amount != 10 || s.RUB.Rate != 43.633 {
		t.Fatalf("unexpected RUB: %+v", s.RUB)
	}
	if amdToRUB := s.RUB.Amount / s.RUB.Rate; amdToRUB <= 0.22 || amdToRUB >= 0.23 {
		t.Fatalf("RUB conversion factor via Amount is wrong: %v", amdToRUB)
	}
}

func TestParseCBAExchangeRatesHandlesSOAPNamespace(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", validCBARates)
	s, err := parseCBAExchangeRates([]byte(body))
	if err != nil {
		t.Fatalf("parse namespaced SOAP body: %v", err)
	}
	if s.USD.Rate != 365.38 || s.RUB.Rate != 4.3633 {
		t.Fatalf("unexpected rates: %+v", s)
	}
	if !s.PublishedAt.Equal(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected publishedAt: %v", s.PublishedAt)
	}
}

func TestParseCBAExchangeRatesMalformedXML(t *testing.T) {
	if _, err := parseCBAExchangeRates([]byte("not xml at all <<<")); err == nil {
		t.Fatal("want error for malformed xml")
	}
}

func TestParseCBAExchangeRatesMissingUSD(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", cbaRateXML("RUB", "1", "4.3633"))
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error when USD is missing")
	}
}

func TestParseCBAExchangeRatesMissingRUB(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", cbaRateXML("USD", "1", "365.38"))
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error when RUB is missing")
	}
}

func TestParseCBAExchangeRatesNonPositiveRate(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", cbaRateXML("USD", "1", "0")+cbaRateXML("RUB", "1", "4.3633"))
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error for non-positive rate")
	}
}

func TestParseCBAExchangeRatesNonPositiveAmount(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", cbaRateXML("USD", "-1", "365.38")+cbaRateXML("RUB", "1", "4.3633"))
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error for non-positive amount")
	}
}

func TestParseCBAExchangeRatesNonFiniteRate(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00", cbaRateXML("USD", "1", "NaN")+cbaRateXML("RUB", "1", "4.3633"))
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error for non-finite rate")
	}
}

func TestParseCBAExchangeRatesCurrentDateWithZ(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T00:00:00Z", validCBARates)
	s, err := parseCBAExchangeRates([]byte(body))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if !s.PublishedAt.Equal(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected publishedAt: %v", s.PublishedAt)
	}
}

func TestParseCBAExchangeRatesCurrentDateWithOffset(t *testing.T) {
	body := cbaSOAPResponse("2026-08-24T04:00:00+04:00", validCBARates)
	s, err := parseCBAExchangeRates([]byte(body))
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if !s.PublishedAt.Equal(time.Date(2026, 8, 24, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected publishedAt: %v", s.PublishedAt)
	}
	if s.PublishedAt.Location() != time.UTC {
		t.Fatalf("want PublishedAt normalized to UTC, got location %v", s.PublishedAt.Location())
	}
}

func TestParseCBAExchangeRatesMissingDate(t *testing.T) {
	body := cbaSOAPResponse("", validCBARates)
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error for missing CurrentDate")
	}
}

func TestParseCBAExchangeRatesInvalidDate(t *testing.T) {
	body := cbaSOAPResponse("not-a-date", validCBARates)
	if _, err := parseCBAExchangeRates([]byte(body)); err == nil {
		t.Fatal("want error for invalid CurrentDate")
	}
}

func TestFetchCBAExchangeRatesNon2xx(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()
	orig := cbaExchangeRatesEndpoint
	cbaExchangeRatesEndpoint = srv.URL
	defer func() { cbaExchangeRatesEndpoint = orig }()

	if _, err := fetchCBAExchangeRates(context.Background()); err == nil {
		t.Fatal("want error for non-2xx status")
	}
}

func TestFetchCBAExchangeRatesTimeout(t *testing.T) {
	release := make(chan struct{})
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		<-release
	}))
	defer func() {
		close(release)
		srv.Close()
	}()
	orig := cbaExchangeRatesEndpoint
	cbaExchangeRatesEndpoint = srv.URL
	defer func() { cbaExchangeRatesEndpoint = orig }()

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	if _, err := fetchCBAExchangeRates(ctx); err == nil {
		t.Fatal("want error on timeout")
	}
}

func TestFetchCBAExchangeRatesOversizedBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/xml; charset=utf-8")
		padding := strings.Repeat(" ", cbaMaxResponseBytes+1)
		body := cbaSOAPResponse("2026-08-24T00:00:00", validCBARates+"<!--"+padding+"-->")
		w.Write([]byte(body))
	}))
	defer srv.Close()
	orig := cbaExchangeRatesEndpoint
	cbaExchangeRatesEndpoint = srv.URL
	defer func() { cbaExchangeRatesEndpoint = orig }()

	if _, err := fetchCBAExchangeRates(context.Background()); err == nil {
		t.Fatal("want error for oversized response body")
	}
}

func TestFetchCBAExchangeRatesSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body := cbaSOAPResponse("2026-08-24T00:00:00", validCBARates)
		w.Header().Set("Content-Type", "text/xml; charset=utf-8")
		w.Write([]byte(body))
	}))
	defer srv.Close()
	orig := cbaExchangeRatesEndpoint
	cbaExchangeRatesEndpoint = srv.URL
	defer func() { cbaExchangeRatesEndpoint = orig }()

	s, err := fetchCBAExchangeRates(context.Background())
	if err != nil {
		t.Fatalf("fetch: %v", err)
	}
	if s.USD.Rate != 365.38 || s.RUB.Rate != 4.3633 {
		t.Fatalf("unexpected snapshot: %+v", s)
	}
}
