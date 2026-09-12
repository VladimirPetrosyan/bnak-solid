package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Notificore REST API — https://help.notificore.ru/#rest-full-api
// POST https://api.notificore.ru/v1.0/sms/create, заголовок X-API-KEY, тело — JSON.
// Номер стран не ограничен: destination "phone" + msisdn с международным кодом страны
// (без "+") доставляет SMS в любую страну, которую поддерживает баланс/тариф аккаунта.
var notificoreSMSURL = "https://api.notificore.ru/v1.0/sms/create"

var notificoreHTTPClient = &http.Client{Timeout: 10 * time.Second}

type notificoreSMSReq struct {
	Destination string `json:"destination"`
	Originator  string `json:"originator"`
	Body        string `json:"body"`
	Msisdn      string `json:"msisdn"`
	Reference   string `json:"reference"`
}

type notificoreSMSResp struct {
	Result struct {
		Error            int    `json:"error"`
		ErrorDescription string `json:"errorDescription"`
		ID               string `json:"id"`
	} `json:"result"`
}

// sendNotificoreSMS отправляет SMS через Notificore. Возвращает ошибку, если ключ не
// настроен (NOTIFICORE_API_KEY пуст), запрос не удался сетевым образом, или сам Notificore
// вернул ненулевой код ошибки.
func sendNotificoreSMS(phone, text, reference string) error {
	if notificoreAPIKey == "" {
		return errors.New("notificore: NOTIFICORE_API_KEY not set")
	}
	// Notificore отклоняет reference с дефисами (error 27 "Invalid External ID") — например,
	// UUID из newID() как есть не проходит, без дефисов тот же UUID принимается нормально.
	body, err := json.Marshal(notificoreSMSReq{
		Destination: "phone",
		Originator:  notificoreSender,
		Body:        text,
		Msisdn:      phone,
		Reference:   strings.ReplaceAll(reference, "-", ""),
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPut, notificoreSMSURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-KEY", notificoreAPIKey)

	resp, err := notificoreHTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("notificore: request failed: %w", err)
	}
	defer resp.Body.Close()

	var out notificoreSMSResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return fmt.Errorf("notificore: bad response (status %d): %w", resp.StatusCode, err)
	}
	if out.Result.Error != 0 {
		return fmt.Errorf("notificore: %s (code %d)", out.Result.ErrorDescription, out.Result.Error)
	}
	return nil
}
