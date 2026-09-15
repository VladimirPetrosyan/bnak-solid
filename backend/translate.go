package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

// Yandex Translate API v2 — https://yandex.cloud/docs/translate/api-ref/Translation/translate
// Переводим пользовательский текст (описания объявлений, сообщения чата) под язык
// интерфейса читателя. Кэшируем результат в таблице translations (см. db.go), чтобы
// платить только за уникальный текст, а не за каждый показ.
var yandexTranslateURL = "https://translate.api.cloud.yandex.net/translate/v2/translate"

var translateHTTPClient = &http.Client{Timeout: 10 * time.Second}

// supportedTranslateLangs — коды языков интерфейса, см. langCode() в src/store.js.
var supportedTranslateLangs = map[string]bool{"hy": true, "ru": true, "en": true}

// translateBatchSize — сколько текстов уходит в один запрос к Yandex Translate.
// Ограничение искусственное (у API есть лимиты на размер запроса) — с запасом
// достаточно для страницы объявлений (LIMIT 500) и переписки чата.
const translateBatchSize = 100

type yandexTranslateReq struct {
	FolderID           string   `json:"folderId"`
	Texts              []string `json:"texts"`
	TargetLanguageCode string   `json:"targetLanguageCode"`
}

type yandexTranslateResp struct {
	Translations []struct {
		Text string `json:"text"`
	} `json:"translations"`
}

// requestLang достаёт целевой язык перевода из заголовка X-Lang, который фронтенд
// выставляет через api.js/setApiLang согласно langCode(). Пустая строка — перевод
// не запрошен (или язык не поддерживается) — вызывающий код должен отдать текст как есть.
func requestLang(r *http.Request) string {
	lang := r.Header.Get("X-Lang")
	if supportedTranslateLangs[lang] {
		return lang
	}
	return ""
}

// userLang возвращает сохранённый язык интерфейса пользователя (см. auth.go withUser) —
// пусто, если пользователь не найден или язык ещё не поддерживается, и вызывающий код
// должен пропустить перевод.
func userLang(userID string) string {
	var lang string
	if err := db.QueryRow(`SELECT lang FROM users WHERE id = ?`, userID).Scan(&lang); err != nil {
		return ""
	}
	if !supportedTranslateLangs[lang] {
		return ""
	}
	return lang
}

func translateHash(text, lang string) string {
	sum := sha256.Sum256([]byte(lang + "\x00" + text))
	return hex.EncodeToString(sum[:])
}

// translateCached переводит один текст. Обёртка над translateBatch для мест, где
// переводится ровно одно поле (например, описание одного объявления).
func translateCached(text, lang string) string {
	return translateBatch([]string{text}, lang)[0]
}

// translateBatch переводит набор текстов на lang одним запросом к Yandex Translate
// (для текстов, которых ещё нет в кэше). Порядок и длина результата всегда совпадают
// со входом. Если lang не поддерживается, ключ/folderId не заданы, или запрос к Yandex
// не удался — возвращает исходные тексты без изменений: перевод — это улучшение,
// а не то, из-за чего может отвалиться выдача объявлений или чата.
func translateBatch(texts []string, lang string) []string {
	out := make([]string, len(texts))
	copy(out, texts)
	if !supportedTranslateLangs[lang] {
		return out
	}

	type miss struct {
		idx  int
		hash string
	}
	misses := make([]miss, 0, len(texts))
	for i, text := range texts {
		if text == "" {
			continue
		}
		h := translateHash(text, lang)
		var cached string
		if err := db.QueryRow(`SELECT text FROM translations WHERE hash = ? AND lang = ?`, h, lang).Scan(&cached); err == nil {
			out[i] = cached
			continue
		}
		misses = append(misses, miss{idx: i, hash: h})
	}

	for start := 0; start < len(misses); start += translateBatchSize {
		end := start + translateBatchSize
		if end > len(misses) {
			end = len(misses)
		}
		chunk := misses[start:end]
		chunkTexts := make([]string, len(chunk))
		for i, m := range chunk {
			chunkTexts[i] = texts[m.idx]
		}
		translated, err := callYandexTranslate(chunkTexts, lang)
		if err != nil {
			continue // исходный текст в out уже стоит по умолчанию
		}
		now := time.Now().UTC()
		for i, m := range chunk {
			if i >= len(translated) {
				break
			}
			out[m.idx] = translated[i]
			db.Exec(`INSERT OR REPLACE INTO translations(hash, lang, text, created_at) VALUES (?, ?, ?, ?)`,
				m.hash, lang, translated[i], now)
		}
	}
	return out
}

func callYandexTranslate(texts []string, lang string) ([]string, error) {
	if yandexTranslateKey == "" || yandexFolderID == "" {
		return nil, errors.New("translate: YANDEX_TRANSLATE_API_KEY/YANDEX_FOLDER_ID not set")
	}
	body, err := json.Marshal(yandexTranslateReq{
		FolderID:           yandexFolderID,
		Texts:              texts,
		TargetLanguageCode: lang,
	})
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(http.MethodPost, yandexTranslateURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Api-Key "+yandexTranslateKey)

	resp, err := translateHTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("translate: request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("translate: bad status %d", resp.StatusCode)
	}
	var out yandexTranslateResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, fmt.Errorf("translate: bad response: %w", err)
	}
	if len(out.Translations) != len(texts) {
		return nil, fmt.Errorf("translate: expected %d translations, got %d", len(texts), len(out.Translations))
	}
	result := make([]string, len(out.Translations))
	for i, t := range out.Translations {
		result[i] = t.Text
	}
	return result, nil
}
