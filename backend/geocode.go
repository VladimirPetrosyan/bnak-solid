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
	Street   string  `json:"street"`
	Full     string  `json:"full"`
	District string  `json:"district,omitempty"` // наш внутренний ключ района (kentron и т.п.), если Yandex его вернул и он распознан
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
}

// Геокодирование адреса объявления через Yandex Geocoder HTTP API — тот же ключ, что и
// для JS API карты на фронтенде (продукт "JavaScript API и HTTP Геокодер" в консоли
// Yandex, см. YANDEX_MAPS_API_KEY в README). Раньше координаты объявления были просто
// случайной точкой рядом с центром города (см. git-историю publishListing в
// postPayload.js/store.js) — из-за этого метка на карте могла оказаться на другой
// улице. Без ключа или когда геокодер не нашёл адрес, ok=false и вызывающий код
// оставляет прежние координаты (тот самый случайный фолбэк) как есть.
var yandexGeocoderURL = "https://geocode-maps.yandex.ru/1.x/"

// yandexSuggestURL — Yandex Geosuggest API, отдельный продукт от HTTP Геокодера (включается
// в консоли Yandex отдельно, тем же ключом). В отличие от Geocoder — специализированный
// сервис автодополнения по мере ввода: отдаёт совпадения уже с первого символа, как в
// Яндекс.Картах/Такси, в т.ч. на армянском. Прямые server-to-server запросы сюда какое-то
// время после создания/привязки продукта к ключу отвечают 403 (см. историю в geocode_test.go
// нет — не тестовый кейс, а разовая заминка на стороне Yandex) — если снова начнёт падать
// 403 без auth-ошибки в теле, проверьте, что прошло достаточно времени после включения
// продукта "API Геосаджеста" на ключе в консоли.
var yandexSuggestURL = "https://suggest-maps.yandex.ru/v1/suggest"

// armeniaBBox — грубый охват территории Армении (юго-запад~северо-восток), чтобы короткие
// запросы не уводили совпадения в другие страны с похожими названиями.
var armeniaBBox = []string{"43.45,38.82", "46.62,41.30"}

var suggestLangByCode = map[string]string{"hy": "hy_AM", "ru": "ru_RU", "en": "en_US"}

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
func runGeocode(query string, results int, kind string) (yandexGeocodeResp, bool) {
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
	if kind != "" {
		q.Set("kind", kind)
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
	out, ok := runGeocode(geocodeQueryAddress(city, district, street), 1, "")
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
		if out, ok := runGeocode(geocodeQueryAddress(city, district, alt), limit, ""); ok {
			suggestions = append(suggestions, parseAddressSuggestions(out)...)
		}
	}
	if out, ok := runGeocode(geocodeQueryAddress(city, district, street), limit, ""); ok {
		suggestions = append(suggestions, parseAddressSuggestions(out)...)
	}
	suggestions = dedupeSuggestions(suggestions, limit)
	// Address.Components у Yandex почти никогда не содержит район вместе с точным домом —
	// район отдаётся отдельным, менее точным объектом. Поэтому докидываем его отдельным
	// обратным геокодированием по координатам с kind=district, и только для первого (самого
	// вероятного после genitiveFallback) варианта — иначе на каждую подсказку уходил бы
	// отдельный запрос к Yandex.
	if len(suggestions) > 0 && suggestions[0].District == "" {
		if key := districtAt(suggestions[0].Lat, suggestions[0].Lng); key != "" {
			suggestions[0].District = key
		}
	}
	return suggestions
}

// districtAt — административный район Еревана по координатам (обратное геокодирование с
// kind=district — так Yandex надёжно отдаёт район, в отличие от геокодирования по тексту
// адреса с домом, см. addressSuggestions).
func districtAt(lat, lng float64) string {
	out, ok := runGeocode(strconv.FormatFloat(lng, 'f', -1, 64)+","+strconv.FormatFloat(lat, 'f', -1, 64), 1, "district")
	if !ok {
		return ""
	}
	members := out.Response.GeoObjectCollection.FeatureMember
	if len(members) == 0 {
		return ""
	}
	for _, c := range members[0].GeoObject.MetaDataProperty.GeocoderMetaData.Address.Components {
		if c.Kind == "district" {
			if key := matchDistrictKey(c.Name); key != "" {
				return key
			}
		}
	}
	return ""
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
		var streetName, houseName, districtKey string
		for _, c := range meta.Address.Components {
			switch c.Kind {
			case "street":
				streetName = c.Name
			case "house":
				houseName = c.Name
			case "district":
				if districtKey == "" {
					districtKey = matchDistrictKey(c.Name)
				}
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
		suggestions = append(suggestions, AddressSuggestion{Street: text, Full: meta.Text, District: districtKey, Lat: lat, Lng: lng})
	}
	return suggestions
}

// matchDistrictKey сопоставляет название района от Yandex ("административный район
// Кентрон") с нашим внутренним ключом ("kentron") по вхождению русского имени —
// у Yandex бывает префикс "административный район"/"квартал", у нас — нет.
func matchDistrictKey(yandexName string) string {
	for key, ru := range districtRuNames {
		if key != "center" && strings.Contains(yandexName, ru) {
			return key
		}
	}
	return ""
}

type yandexSuggestResp struct {
	Results []struct {
		Title struct {
			Text string `json:"text"`
		} `json:"title"`
		Subtitle struct {
			Text string `json:"text"`
		} `json:"subtitle"`
		Tags []string `json:"tags"`
	} `json:"results"`
}

// runSuggest — запрос к Yandex Geosuggest API (см. yandexSuggestURL выше), ограниченный
// территорией Армении через bbox+strict_bounds, чтобы короткий ввод не уводил совпадения в
// другие страны. lang — код языка интерфейса (см. requestLang в translate.go); пустая строка
// или неизвестный код — используется ru_RU, как и для обычного Geocoder.
func runSuggest(query, lang string, results int) (yandexSuggestResp, bool) {
	var out yandexSuggestResp
	if yandexGeocoderKey == "" || strings.TrimSpace(query) == "" {
		return out, false
	}
	suggestLang := suggestLangByCode[lang]
	if suggestLang == "" {
		suggestLang = "ru_RU"
	}
	q := url.Values{
		"apikey":        {yandexGeocoderKey},
		"text":          {query},
		"lang":          {suggestLang},
		"results":       {strconv.Itoa(results)},
		"bbox":          {armeniaBBox[0] + "~" + armeniaBBox[1]},
		"strict_bounds": {"1"},
		"type":          {"geo"},
	}
	req, err := http.NewRequest(http.MethodGet, yandexSuggestURL+"?"+q.Encode(), nil)
	if err != nil {
		return out, false
	}
	// см. комментарий в runGeocode — тот же ключ, то же ограничение по Referer.
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

// suggestLabels — чистая часть runSuggest без сетевого вызова (для теста на фиксированном
// JSON). Организации ("tags":["business",...]) отбрасываем — фронтенду нужны только реальные
// адреса, не названия заведений; type=geo в запросе уже должен это делать, но Yandex иногда
// всё равно подмешивает сильные совпадения по названию, поэтому фильтруем ещё раз на своей
// стороне.
func suggestLabels(out yandexSuggestResp) []string {
	seen := map[string]bool{}
	labels := []string{}
	for _, r := range out.Results {
		business := false
		for _, tag := range r.Tags {
			if tag == "business" {
				business = true
				break
			}
		}
		if business {
			continue
		}
		title := strings.TrimSpace(r.Title.Text)
		if title == "" {
			continue
		}
		label := title
		if sub := strings.TrimSpace(r.Subtitle.Text); sub != "" {
			label = sub + ", " + title
		}
		if seen[label] {
			continue
		}
		seen[label] = true
		labels = append(labels, label)
	}
	return labels
}

// ---------- GET /api/geocode/suggest ----------

// handleGeocodeSuggest — подсказки по мере ввода через Yandex Geosuggest API: в отличие от
// обычного Geocoder (см. addressSuggestions), даёт совпадения уже с первого символа, включая
// армянский ввод. Если Suggest недоступен (сетевая ошибка, продукт ещё не активирован на
// ключе и т.п.), откатываемся на Geocoder — хуже по UX (нужен более полный адрес), но не
// ломает форму совсем.
func handleGeocodeSuggest(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if out, ok := runSuggest(q.Get("q"), requestLang(r), 5); ok {
		if labels := suggestLabels(out); len(labels) > 0 {
			writeJSON(w, http.StatusOK, labels)
			return
		}
	}
	suggestions := addressSuggestions(q.Get("city"), q.Get("d"), q.Get("q"), 5)
	labels := make([]string, 0, len(suggestions))
	for _, s := range suggestions {
		labels = append(labels, s.Full)
	}
	writeJSON(w, http.StatusOK, labels)
}

// ---------- GET /api/geocode/resolve ----------

// handleGeocodeResolve превращает выбранный пользователем вариант (текст из handleGeocodeSuggest)
// в структурированный результат с координатами и районом. У Suggest нет координат в ответе —
// только текст, поэтому после выбора подсказки фронтенд всегда донабирает точные данные здесь,
// через уже существующий geocoder-путь addressSuggestions (лишний токен локали в начале строки
// вроде "Ереван, ..." Yandex Geocoder спокойно проглатывает вместе с уже подставляемым городом).
func handleGeocodeResolve(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	suggestions := addressSuggestions(q.Get("city"), q.Get("d"), q.Get("text"), 1)
	if len(suggestions) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{})
		return
	}
	writeJSON(w, http.StatusOK, suggestions[0])
}
