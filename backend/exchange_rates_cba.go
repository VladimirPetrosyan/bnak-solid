package main

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var cbaExchangeRatesEndpoint = "https://api.cba.am/exchangerates.asmx"

const cbaSOAPAction = "http://www.cba.am/ExchangeRatesLatest"

const cbaSOAPRequestBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ExchangeRatesLatest xmlns="http://www.cba.am/" />
  </soap:Body>
</soap:Envelope>`

var cbaHTTPClient = &http.Client{}

const cbaMaxResponseBytes = 1 << 20

var cbaCurrentDateLayouts = []string{time.RFC3339, "2006-01-02T15:04:05"}

type exchangeRate struct {
	Amount float64
	Rate   float64
}

type exchangeRateSnapshot struct {
	USD         exchangeRate
	RUB         exchangeRate
	PublishedAt time.Time
	UpdatedAt   time.Time
}

type cbaSOAPEnvelope struct {
	Body struct {
		Response struct {
			Result struct {
				CurrentDate string `xml:"CurrentDate"`
				Rates       struct {
					Rate []cbaRate `xml:"ExchangeRate"`
				} `xml:"Rates"`
			} `xml:"ExchangeRatesLatestResult"`
		} `xml:"ExchangeRatesLatestResponse"`
	} `xml:"Body"`
}

type cbaRate struct {
	ISO    string `xml:"ISO"`
	Amount string `xml:"Amount"`
	Rate   string `xml:"Rate"`
}

func fetchCBAExchangeRates(ctx context.Context) (exchangeRateSnapshot, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, cbaExchangeRatesEndpoint, strings.NewReader(cbaSOAPRequestBody))
	if err != nil {
		return exchangeRateSnapshot{}, err
	}
	req.Header.Set("Content-Type", "text/xml; charset=utf-8")
	req.Header.Set("SOAPAction", cbaSOAPAction)

	resp, err := cbaHTTPClient.Do(req)
	if err != nil {
		return exchangeRateSnapshot{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return exchangeRateSnapshot{}, fmt.Errorf("cba: unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, cbaMaxResponseBytes+1))
	if err != nil {
		return exchangeRateSnapshot{}, err
	}
	if len(body) > cbaMaxResponseBytes {
		return exchangeRateSnapshot{}, fmt.Errorf("cba: response body exceeds %d bytes", cbaMaxResponseBytes)
	}
	return parseCBAExchangeRates(body)
}

func parseCBACurrentDate(v string) (time.Time, error) {
	for _, layout := range cbaCurrentDateLayouts {
		if t, err := time.Parse(layout, v); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("cba: invalid CurrentDate %q", v)
}

func parseCBAExchangeRates(body []byte) (exchangeRateSnapshot, error) {
	var env cbaSOAPEnvelope
	if err := xml.Unmarshal(body, &env); err != nil {
		return exchangeRateSnapshot{}, fmt.Errorf("cba: parse xml: %w", err)
	}

	result := env.Body.Response.Result
	publishedAt, err := parseCBACurrentDate(result.CurrentDate)
	if err != nil {
		return exchangeRateSnapshot{}, err
	}

	usd, ok := findCBARate(result.Rates.Rate, "USD")
	if !ok {
		return exchangeRateSnapshot{}, fmt.Errorf("cba: missing or invalid USD rate")
	}
	rub, ok := findCBARate(result.Rates.Rate, "RUB")
	if !ok {
		return exchangeRateSnapshot{}, fmt.Errorf("cba: missing or invalid RUB rate")
	}

	return exchangeRateSnapshot{USD: usd, RUB: rub, PublishedAt: publishedAt}, nil
}

func findCBARate(rates []cbaRate, iso string) (exchangeRate, bool) {
	for _, r := range rates {
		if r.ISO != iso {
			continue
		}
		amount, err := strconv.ParseFloat(r.Amount, 64)
		if err != nil || !isPositiveFinite(amount) {
			return exchangeRate{}, false
		}
		rate, err := strconv.ParseFloat(r.Rate, 64)
		if err != nil || !isPositiveFinite(rate) {
			return exchangeRate{}, false
		}
		return exchangeRate{Amount: amount, Rate: rate}, true
	}
	return exchangeRate{}, false
}

func isPositiveFinite(f float64) bool {
	return f > 0 && !math.IsInf(f, 0) && !math.IsNaN(f)
}
