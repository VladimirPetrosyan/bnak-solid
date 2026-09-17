package main

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// AddressSuggestion — один вариант адреса для автодополнения поля "Улица и дом" в форме
// размещения (см. handleGeocodeSuggest ниже) — чтобы пользователь выбирал из реальных
// адресов вместо свободного текста. Street — то, что подставляется в поле (без города и
// страны), Full — весь адрес для показа в выпадающем списке, чтобы было видно совпадение.
type AddressSuggestion struct {
	Street string  `json:"street"`
	Full   string  `json:"full"`
	Lat    float64 `json:"lat"`
	Lng    float64 `json:"lng"`
}

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
					MetaDataProperty struct {
						GeocoderMetaData struct {
							Text    string `json:"text"`
							Address struct {
								Components []struct {
									Kind string `json:"kind"`
									Name string `json:"name"`
								} `json:"Components"`
							} `json:"Address"`
						} `json:"GeocoderMetaData"`
					} `json:"metaDataProperty"`
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

// runGeocode — общий HTTP-запрос к Yandex Geocoder, используется и для получения координат
// одного адреса (geocodeAddress), и для списка вариантов на подбор (addressSuggestions).
func runGeocode(query string, results int) (yandexGeocodeResp, bool) {
	var out yandexGeocodeResp
	if yandexGeocoderKey == "" || strings.TrimSpace(query) == "" {
		return out, false
	}
	q := url.Values{
		"apikey":  {yandexGeocoderKey},
		"format":  {"json"},
		"geocode": {query},
		"results": {strconv.Itoa(results)},
		"lang":    {"ru_RU"},
	}
	req, err := http.NewRequest(http.MethodGet, yandexGeocoderURL+"?"+q.Encode(), nil)
	if err != nil {
		return out, false
	}
	// Ключ ограничен по HTTP Referer в консоли Yandex (localhost/hayhome.am) — серверный
	// запрос сам по себе Referer не шлёт, поэтому подставляем домен из allowlist явно.
	req.Header.Set("Referer", "https://hayhome.am/")
	resp, err := geocodeHTTPClient.Do(req)
	if err != nil {
		return out, false
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return out, false
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return out, false
	}
	return out, true
}

// geocodeAddress возвращает координаты объявления по городу/району/улице. ok=false,
// если ключ не настроен, запрос не удался или геокодер ничего не нашёл.
func geocodeAddress(city, district, street string) (lat, lng float64, ok bool) {
	out, ok := runGeocode(geocodeQueryAddress(city, district, street), 1)
	if !ok {
		return 0, 0, false
	}
	members := out.Response.GeoObjectCollection.FeatureMember
	if len(members) == 0 {
		return 0, 0, false
	}
	return parsePos(members[0].GeoObject.Point.Pos)
}

// parsePos — Yandex отдаёт "pos" как "долгота широта" (lng lat), а не наоборот.
func parsePos(pos string) (lat, lng float64, ok bool) {
	fields := strings.Fields(pos)
	if len(fields) != 2 {
		return 0, 0, false
	}
	lonVal, err1 := strconv.ParseFloat(fields[0], 64)
	latVal, err2 := strconv.ParseFloat(fields[1], 64)
	if err1 != nil || err2 != nil {
		return 0, 0, false
	}
	return latVal, lonVal, true
}

// addressSuggestions — варианты реального адреса под то, что пользователь уже ввёл в поле
// "Улица и дом" (см. handleGeocodeSuggest). HTTP Geocoder — не специализированный сервис
// автодополнения по мере ввода символов, поэтому короткие фрагменты могут давать шумные
// совпадения (город/район вместо улицы) — отбрасываем кандидатов без компонента "street",
// чтобы в списке были только настоящие улицы.
func addressSuggestions(city, district, query string, limit int) []AddressSuggestion {
	street := strings.TrimSpace(query)
	if street == "" {
		return nil
	}
	suggestions := []AddressSuggestion{}
	// см. genitiveFallback — большинство "именных" улиц Еревана требуют родительный падеж
	// ("Маргаряна", не "Маргарян"), без него Yandex подбирает совсем другую улицу. Спрашиваем
	// эту форму первой: если она находится, это почти наверняка то, что имел в виду
	// пользователь, и такие совпадения должны быть в начале списка, а не после шумных.
	if alt := genitiveFallback(street); alt != "" {
		if out, ok := runGeocode(geocodeQueryAddress(city, district, alt), limit); ok {
			suggestions = append(suggestions, parseAddressSuggestions(out)...)
		}
	}
	if out, ok := runGeocode(geocodeQueryAddress(city, district, street), limit); ok {
		suggestions = append(suggestions, parseAddressSuggestions(out)...)
	}
	return dedupeSuggestions(suggestions, limit)
}

// genitiveFallback пытается подобрать русскую родительную форму для улиц, названных в
// честь армянских фамилий на "-ян" (Абовян -> Абовяна, Маргарян -> Маргаряна и т.п.) — в
// Ереване это подавляющее большинство "именных" улиц. Yandex Geocoder не считает
// "Абовян" и "Абовяна" словоформами одной улицы, так что запрос без родительного падежа
// либо ничего не находит, либо подбирает совсем другое место с похожим написанием.
// Возвращает "" если преобразовывать нечего (последнее кириллическое слово не на "н").
func genitiveFallback(query string) string {
	words := strings.Fields(query)
	for i := len(words) - 1; i >= 0; i-- {
		w := []rune(words[i])
		if len(w) == 0 || !containsCyrillic(w) {
			continue
		}
		last := w[len(w)-1]
		if last != 'н' && last != 'Н' {
			return ""
		}
		words[i] = string(w) + "а"
		return strings.Join(words, " ")
	}
	return ""
}

func containsCyrillic(w []rune) bool {
	for _, r := range w {
		if (r >= 'а' && r <= 'я') || (r >= 'А' && r <= 'Я') || r == 'ё' || r == 'Ё' {
			return true
		}
	}
	return false
}

// dedupeSuggestions убирает повторы (два запроса-варианта могут найти один и тот же дом)
// и обрезает до limit.
func dedupeSuggestions(in []AddressSuggestion, limit int) []AddressSuggestion {
	seen := map[string]bool{}
	out := []AddressSuggestion{}
	for _, s := range in {
		if seen[s.Full] {
			continue
		}
		seen[s.Full] = true
		out = append(out, s)
		if len(out) >= limit {
			break
		}
	}
	return out
}

// parseAddressSuggestions — чистая часть addressSuggestions без сетевого вызова, отдельно
// от runGeocode ради теста на фиксированном JSON-ответе Yandex.
func parseAddressSuggestions(out yandexGeocodeResp) []AddressSuggestion {
	suggestions := []AddressSuggestion{}
	for _, m := range out.Response.GeoObjectCollection.FeatureMember {
		meta := m.GeoObject.MetaDataProperty.GeocoderMetaData
		var streetName, houseName string
		for _, c := range meta.Address.Components {
			switch c.Kind {
			case "street":
				streetName = c.Name
			case "house":
				houseName = c.Name
			}
		}
		if streetName == "" {
			continue
		}
		text := streetName
		if houseName != "" {
			text += ", " + houseName
		}
		lat, lng, ok := parsePos(m.GeoObject.Point.Pos)
		if !ok {
			continue
		}
		suggestions = append(suggestions, AddressSuggestion{Street: text, Full: meta.Text, Lat: lat, Lng: lng})
	}
	return suggestions
}

// ---------- GET /api/geocode/suggest ----------

func handleGeocodeSuggest(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	suggestions := addressSuggestions(q.Get("city"), q.Get("d"), q.Get("q"), 5)
	writeJSON(w, http.StatusOK, suggestions)
}
