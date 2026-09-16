package main

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Геокодирование адреса объявления через Yandex Geocoder HTTP API — тот же ключ, что и
// для JS API карты на фронтенде (продукт "JavaScript API и HTTP Геокодер" в консоли
// Yandex, см. YANDEX_MAPS_API_KEY в README). Раньше координаты объявления были просто
// случайной точкой рядом с центром города (см. git-историю publishListing в
// postPayload.js/store.js) — из-за этого метка на карте могла оказаться на другой
// улице. Без ключа или когда геокодер не нашёл адрес, ok=false и вызывающий код
// оставляет прежние координаты (тот самый случайный фолбэк) как есть.
var yandexGeocoderURL = "https://geocode-maps.yandex.ru/1.x/"

var geocodeHTTPClient = &http.Client{Timeout: 8 * time.Second}

var cityRuNames = map[string]string{
	"yerevan":     "Ереван",
	"gyumri":      "Гюмри",
	"vanadzor":    "Ванадзор",
	"dilijan":     "Дилижан",
	"tsaghkadzor": "Цахкадзор",
	"sevan":       "Севан",
}

var districtRuNames = map[string]string{
	"kentron":   "Кентрон",
	"arabkir":   "Арабкир",
	"kanaker":   "Канакер-Зейтун",
	"shengavit": "Шенгавит",
	"malatia":   "Малатия-Себастия",
	"davtashen": "Давташен",
	"nornork":   "Нор Норк",
	"erebuni":   "Эребуни",
	"ajapnyak":  "Аджапняк",
	"avan":      "Аван",
	"center":    "Центр",
}

type yandexGeocodeResp struct {
	Response struct {
		GeoObjectCollection struct {
			FeatureMember []struct {
				GeoObject struct {
					Point struct {
						Pos string `json:"pos"`
					} `json:"Point"`
				} `json:"GeoObject"`
			} `json:"featureMember"`
		} `json:"GeoObjectCollection"`
	} `json:"response"`
}

func geocodeQueryAddress(city, district, street string) string {
	parts := []string{"Армения"}
	if name := cityRuNames[city]; name != "" {
		parts = append(parts, name)
	}
	// районы в data.js заведены только для Еревана — для остальных городов ключ district
	// либо пуст, либо не соответствует реальному месту, поэтому его подмешиваем только тут
	if city == "yerevan" {
		if name := districtRuNames[district]; name != "" {
			parts = append(parts, name)
		}
	}
	parts = append(parts, strings.TrimSpace(street))
	return strings.Join(parts, ", ")
}

// geocodeAddress возвращает координаты объявления по городу/району/улице. ok=false,
// если ключ не настроен, запрос не удался или геокодер ничего не нашёл.
func geocodeAddress(city, district, street string) (lat, lng float64, ok bool) {
	if yandexGeocoderKey == "" || strings.TrimSpace(street) == "" {
		return 0, 0, false
	}
	q := url.Values{
		"apikey":  {yandexGeocoderKey},
		"format":  {"json"},
		"geocode": {geocodeQueryAddress(city, district, street)},
		"results": {"1"},
		"lang":    {"ru_RU"},
	}
	req, err := http.NewRequest(http.MethodGet, yandexGeocoderURL+"?"+q.Encode(), nil)
	if err != nil {
		return 0, 0, false
	}
	// Ключ ограничен по HTTP Referer в консоли Yandex (localhost/hayhome.am) — серверный
	// запрос сам по себе Referer не шлёт, поэтому подставляем домен из allowlist явно.
	req.Header.Set("Referer", "https://hayhome.am/")
	resp, err := geocodeHTTPClient.Do(req)
	if err != nil {
		return 0, 0, false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return 0, 0, false
	}
	var out yandexGeocodeResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return 0, 0, false
	}
	members := out.Response.GeoObjectCollection.FeatureMember
	if len(members) == 0 {
		return 0, 0, false
	}
	// Yandex отдаёт "pos" как "долгота широта" (lng lat), а не наоборот
	pos := strings.Fields(members[0].GeoObject.Point.Pos)
	if len(pos) != 2 {
		return 0, 0, false
	}
	lonVal, err1 := strconv.ParseFloat(pos[0], 64)
	latVal, err2 := strconv.ParseFloat(pos[1], 64)
	if err1 != nil || err2 != nil {
		return 0, 0, false
	}
	return latVal, lonVal, true
}
