package main

import (
	"encoding/json"
	"testing"
)

func decodeGeocodeResp(t *testing.T, raw string) yandexGeocodeResp {
	t.Helper()
	var out yandexGeocodeResp
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}
	return out
}

func TestParseAddressSuggestionsExtractsStreetAndHouse(t *testing.T) {
	// снято с реального ответа Yandex Geocoder на "Армения, Ереван, Абовяна 1"
	out := decodeGeocodeResp(t, `{"response":{"GeoObjectCollection":{"featureMember":[{"GeoObject":{
		"metaDataProperty":{"GeocoderMetaData":{
			"text":"Армения, Ереван, улица Абовяна, 1/1",
			"Address":{"Components":[
				{"kind":"country","name":"Армения"},
				{"kind":"province","name":"Ереван"},
				{"kind":"locality","name":"Ереван"},
				{"kind":"street","name":"улица Абовяна"},
				{"kind":"house","name":"1/1"}
			]}
		}},
		"Point":{"pos":"44.513238 40.179261"}
	}}]}}}`)

	got := parseAddressSuggestions(out)
	if len(got) != 1 {
		t.Fatalf("got %d suggestions, want 1: %+v", len(got), got)
	}
	s := got[0]
	if s.Street != "улица Абовяна, 1/1" {
		t.Fatalf("street = %q, want %q", s.Street, "улица Абовяна, 1/1")
	}
	if s.Full != "Армения, Ереван, улица Абовяна, 1/1" {
		t.Fatalf("full = %q", s.Full)
	}
	if s.Lat != 40.179261 || s.Lng != 44.513238 {
		t.Fatalf("lat/lng = %v/%v, want 40.179261/44.513238 (Yandex pos is lng-first)", s.Lat, s.Lng)
	}
}

func TestParseAddressSuggestionsHandlesStreetWithoutHouseNumber(t *testing.T) {
	out := decodeGeocodeResp(t, `{"response":{"GeoObjectCollection":{"featureMember":[{"GeoObject":{
		"metaDataProperty":{"GeocoderMetaData":{
			"text":"Армения, Ереван, улица Туманяна",
			"Address":{"Components":[
				{"kind":"country","name":"Армения"},
				{"kind":"locality","name":"Ереван"},
				{"kind":"street","name":"улица Туманяна"}
			]}
		}},
		"Point":{"pos":"44.51 40.18"}
	}}]}}}`)

	got := parseAddressSuggestions(out)
	if len(got) != 1 || got[0].Street != "улица Туманяна" {
		t.Fatalf("got %+v, want single suggestion \"улица Туманяна\"", got)
	}
}

func TestParseAddressSuggestionsDropsCandidatesWithoutStreetComponent(t *testing.T) {
	// например, когда geocoder нашёл только район/город/ж-д станцию — не настоящий адрес улицы
	out := decodeGeocodeResp(t, `{"response":{"GeoObjectCollection":{"featureMember":[
		{"GeoObject":{"metaDataProperty":{"GeocoderMetaData":{"text":"Армения, Ереван, административный район Кентрон","Address":{"Components":[
			{"kind":"country","name":"Армения"},{"kind":"locality","name":"Ереван"},{"kind":"district","name":"Кентрон"}
		]}}},"Point":{"pos":"44.51 40.18"}}},
		{"GeoObject":{"metaDataProperty":{"GeocoderMetaData":{"text":"Армения, Ереван, улица Абовяна","Address":{"Components":[
			{"kind":"country","name":"Армения"},{"kind":"locality","name":"Ереван"},{"kind":"street","name":"улица Абовяна"}
		]}}},"Point":{"pos":"44.51 40.18"}}}
	]}}}`)

	got := parseAddressSuggestions(out)
	if len(got) != 1 || got[0].Street != "улица Абовяна" {
		t.Fatalf("got %+v, want only the street-level candidate kept", got)
	}
}

func TestParseAddressSuggestionsEmptyOnNoResults(t *testing.T) {
	out := decodeGeocodeResp(t, `{"response":{"GeoObjectCollection":{"featureMember":[]}}}`)
	got := parseAddressSuggestions(out)
	if len(got) != 0 {
		t.Fatalf("got %d suggestions, want 0", len(got))
	}
}

func TestAddressSuggestionsReturnsNilForBlankQuery(t *testing.T) {
	if got := addressSuggestions("yerevan", "kentron", "   ", 5); got != nil {
		t.Fatalf("got %+v, want nil for blank query", got)
	}
}

func TestParseAddressSuggestionsExtractsDistrict(t *testing.T) {
	// снято с реального ответа Yandex Geocoder на "Армения, Ереван, Малатия-Себастия"
	out := decodeGeocodeResp(t, `{"response":{"GeoObjectCollection":{"featureMember":[{"GeoObject":{
		"metaDataProperty":{"GeocoderMetaData":{
			"text":"Армения, Ереван, улица Тестовая, 1",
			"Address":{"Components":[
				{"kind":"country","name":"Армения"},
				{"kind":"locality","name":"Ереван"},
				{"kind":"district","name":"административный район Малатия-Себастия"},
				{"kind":"street","name":"улица Тестовая"},
				{"kind":"house","name":"1"}
			]}
		}},
		"Point":{"pos":"44.5 40.18"}
	}}]}}}`)

	got := parseAddressSuggestions(out)
	if len(got) != 1 || got[0].District != "malatia" {
		t.Fatalf("got %+v, want district = \"malatia\"", got)
	}
}

func TestParseAddressSuggestionsLeavesDistrictEmptyWhenNotRecognized(t *testing.T) {
	out := decodeGeocodeResp(t, `{"response":{"GeoObjectCollection":{"featureMember":[{"GeoObject":{
		"metaDataProperty":{"GeocoderMetaData":{
			"text":"Армения, Ереван, проспект Комитаса, 1",
			"Address":{"Components":[
				{"kind":"street","name":"проспект Комитаса"},
				{"kind":"house","name":"1"}
			]}
		}},
		"Point":{"pos":"44.5 40.18"}
	}}]}}}`)

	got := parseAddressSuggestions(out)
	if len(got) != 1 || got[0].District != "" {
		t.Fatalf("got %+v, want empty district (Yandex gave none)", got)
	}
}

func TestMatchDistrictKey(t *testing.T) {
	cases := map[string]string{
		"административный район Кентрон":          "kentron",
		"административный район Малатия-Себастия": "malatia",
		"квартал Покр Кентрон":                    "kentron",
		"административный район Канакер-Зейтун":   "kanaker",
		"деревня где-то в другом месте":           "",
		"": "",
	}
	for in, want := range cases {
		if got := matchDistrictKey(in); got != want {
			t.Fatalf("matchDistrictKey(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestGenitiveFallbackAddsAOnArmenianSurnameStreets(t *testing.T) {
	cases := map[string]string{
		"Маргарян 45":   "Маргаряна 45",
		"Абовян":        "Абовяна",
		"улица Туманян": "улица Туманяна",
	}
	for in, want := range cases {
		if got := genitiveFallback(in); got != want {
			t.Fatalf("genitiveFallback(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestGenitiveFallbackNoOpWhenAlreadyDeclinedOrNotApplicable(t *testing.T) {
	cases := []string{
		"Маргаряна 45",      // уже родительный падеж
		"проспект Комитаса", // не оканчивается на "н"
		"45",                // только номер дома, кириллицы нет
		"",
	}
	for _, in := range cases {
		if got := genitiveFallback(in); got != "" {
			t.Fatalf("genitiveFallback(%q) = %q, want \"\"", in, got)
		}
	}
}

func TestDedupeSuggestionsRemovesRepeatsAndRespectsLimit(t *testing.T) {
	in := []AddressSuggestion{
		{Street: "улица Маргаряна, 45", Full: "Армения, Ереван, улица Маргаряна, 45"},
		{Street: "улица Маргаряна, 45", Full: "Армения, Ереван, улица Маргаряна, 45"}, // тот же дом от второго запроса
		{Street: "улица Маро Маргарян", Full: "Армения, Ереван, улица Маро Маргарян"},
		{Street: "дорога Норк-Мараш", Full: "Армения, Ереван, дорога Норк-Мараш"},
	}
	got := dedupeSuggestions(in, 2)
	if len(got) != 2 {
		t.Fatalf("got %d suggestions, want 2 (limit)", len(got))
	}
	if got[0].Full != in[0].Full || got[1].Full != in[2].Full {
		t.Fatalf("got %+v, want first two unique entries in order", got)
	}
}
