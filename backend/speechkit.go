package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os/exec"
	"time"
)

// Yandex SpeechKit STT v1 (короткое аудио, до 30 сек) —
// https://yandex.cloud/docs/speechkit/stt/api/request-response
// Голосовые сообщения чата пишутся в webm/opus (или ogg/opus на Firefox, mp4/aac на
// Safari) — SpeechKit понимает только oggopus/lpcm/mp3, поэтому файл сначала
// перегоняется в ogg/opus через ffmpeg. Без ffmpeg или без ключа кнопка «показать
// текст» в чате просто вернёт ошибку — это необязательная надстройка над готовым
// голосовым, а не то, из-за чего может отвалиться сам чат.
var yandexSTTURL = "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize"

var speechHTTPClient = &http.Client{Timeout: 20 * time.Second}

type yandexSTTResp struct {
	Result string `json:"result"`
	Error  string `json:"error_message"`
}

func transcribeAudioFile(path string) (string, error) {
	if yandexSpeechKey == "" || yandexFolderID == "" {
		return "", errors.New("speechkit: YANDEX_SPEECHKIT_API_KEY/YANDEX_FOLDER_ID not set")
	}
	ogg, err := transcodeToOggOpus(path)
	if err != nil {
		return "", fmt.Errorf("speechkit: transcode failed: %w", err)
	}

	q := url.Values{"folderId": {yandexFolderID}, "format": {"oggopus"}}
	req, err := http.NewRequest(http.MethodPost, yandexSTTURL+"?"+q.Encode(), bytes.NewReader(ogg))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Api-Key "+yandexSpeechKey)

	resp, err := speechHTTPClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("speechkit: request failed: %w", err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("speechkit: bad status %d: %s", resp.StatusCode, string(body))
	}
	var out yandexSTTResp
	if err := json.Unmarshal(body, &out); err != nil {
		return "", fmt.Errorf("speechkit: bad response: %w", err)
	}
	if out.Error != "" {
		return "", fmt.Errorf("speechkit: %s", out.Error)
	}
	return out.Result, nil
}

// transcodeToOggOpus гоняет файл через ffmpeg в память — голосовые сообщения короткие
// (до пары минут), так что держать результат целиком в памяти безопасно.
func transcodeToOggOpus(path string) ([]byte, error) {
	cmd := exec.Command("ffmpeg", "-y", "-loglevel", "error", "-i", path, "-c:a", "libopus", "-f", "ogg", "pipe:1")
	var out, stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("%w: %s", err, stderr.String())
	}
	return out.Bytes(), nil
}
