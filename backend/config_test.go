package main

import "testing"

func TestParseOrigins(t *testing.T) {
	cases := []struct {
		name string
		raw  string
		want []string
	}{
		{"empty", "", nil},
		{"single", "https://hayhome.am", []string{"https://hayhome.am"}},
		{"whitespace and trailing slash", "  https://hayhome.am/  , https://www.hayhome.am/ ", []string{"https://hayhome.am", "https://www.hayhome.am"}},
		{"dedup", "https://hayhome.am,https://hayhome.am", []string{"https://hayhome.am"}},
		{"drops empty entries", "https://hayhome.am,,  ,", []string{"https://hayhome.am"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := parseOrigins(c.raw)
			if len(got) != len(c.want) {
				t.Fatalf("parseOrigins(%q) = %v, want %v", c.raw, got, c.want)
			}
			for i := range got {
				if got[i] != c.want[i] {
					t.Fatalf("parseOrigins(%q) = %v, want %v", c.raw, got, c.want)
				}
			}
		})
	}
}

func TestParseDevMode(t *testing.T) {
	cases := []struct {
		raw     string
		want    bool
		wantErr bool
	}{
		{"", false, false},
		{"0", false, false},
		{"false", false, false},
		{"False", false, false},
		{"  0  ", false, false},
		{"1", true, false},
		{"true", true, false},
		{"True", true, false},
		{"  1  ", true, false},
		{"  true  ", true, false},
		{"yes", false, true},
		{"2", false, true},
		{"TRUE1", false, true},
	}
	for _, c := range cases {
		t.Run(c.raw, func(t *testing.T) {
			got, err := parseDevMode(c.raw)
			if c.wantErr {
				if err == nil {
					t.Fatalf("parseDevMode(%q): want error, got nil", c.raw)
				}
				return
			}
			if err != nil {
				t.Fatalf("parseDevMode(%q): unexpected error %v", c.raw, err)
			}
			if got != c.want {
				t.Fatalf("parseDevMode(%q) = %v, want %v", c.raw, got, c.want)
			}
		})
	}
}

func TestValidateOrigins(t *testing.T) {
	if got, err := validateOrigins(true, ""); err != nil || got != "*" {
		t.Fatalf("dev empty: got %q, err %v", got, err)
	}
	if _, err := validateOrigins(false, ""); err == nil {
		t.Fatal("prod empty: want error")
	}
	if _, err := validateOrigins(false, "*"); err == nil {
		t.Fatal("prod wildcard: want error")
	}
	if _, err := validateOrigins(false, "not-a-url"); err == nil {
		t.Fatal("prod malformed origin: want error")
	}
	if _, err := validateOrigins(false, "ftp://hayhome.am"); err == nil {
		t.Fatal("prod non-http(s) scheme: want error")
	}
	got, err := validateOrigins(false, " https://hayhome.am/ , https://www.hayhome.am ")
	if err != nil {
		t.Fatalf("prod valid multi-origin: unexpected error %v", err)
	}
	want := "https://hayhome.am,https://www.hayhome.am"
	if got != want {
		t.Fatalf("prod valid multi-origin: got %q, want %q", got, want)
	}
	malformed := []string{
		"https://user:pass@hayhome.am",
		"https://hayhome.am/some-path",
		"https://hayhome.am?query=1",
		"https://hayhome.am#fragment",
	}
	for _, o := range malformed {
		if _, err := validateOrigins(false, o); err == nil {
			t.Fatalf("origin %q: want error, got none", o)
		}
	}
}

func TestValidatePublicBaseURL(t *testing.T) {
	if got, err := validatePublicBaseURL(true, "", "8080"); err != nil || got != "http://localhost:8080" {
		t.Fatalf("dev empty: got %q, err %v", got, err)
	}
	if _, err := validatePublicBaseURL(false, "", "8080"); err == nil {
		t.Fatal("prod empty: want error")
	}
	if _, err := validatePublicBaseURL(false, "not-a-url", "8080"); err == nil {
		t.Fatal("prod malformed: want error")
	}
	if _, err := validatePublicBaseURL(false, "http://hayhome.am", "8080"); err == nil {
		t.Fatal("prod non-https: want error")
	}
	got, err := validatePublicBaseURL(false, "https://api.hayhome.am/", "8080")
	if err != nil || got != "https://api.hayhome.am" {
		t.Fatalf("prod valid https trailing slash: got %q, err %v", got, err)
	}
	if got, err := validatePublicBaseURL(false, "https://api.hayhome.am/api", "8080"); err != nil || got != "https://api.hayhome.am/api" {
		t.Fatalf("prod valid https with path: got %q, err %v", got, err)
	}
	malformed := []string{
		"https://user:pass@api.hayhome.am",
		"https://api.hayhome.am?query=1",
		"https://api.hayhome.am#fragment",
	}
	for _, u := range malformed {
		if _, err := validatePublicBaseURL(false, u, "8080"); err == nil {
			t.Fatalf("PUBLIC_BASE_URL %q: want error, got none", u)
		}
	}
}

func TestValidateOperatorEmail(t *testing.T) {
	if got, err := validateOperatorEmail(true, ""); err != nil || got != "support@hayhome.am" {
		t.Fatalf("dev empty: got %q, err %v", got, err)
	}
	if _, err := validateOperatorEmail(false, ""); err == nil {
		t.Fatal("prod empty: want error")
	}
	if _, err := validateOperatorEmail(false, "not-an-email"); err == nil {
		t.Fatal("prod invalid: want error")
	}
	if got, err := validateOperatorEmail(false, "support@hayhome.am"); err != nil || got != "support@hayhome.am" {
		t.Fatalf("prod valid: got %q, err %v", got, err)
	}
}

func TestValidateOperatorCity(t *testing.T) {
	if got, err := validateOperatorCity(true, ""); err != nil || got != "Yerevan" {
		t.Fatalf("dev empty: got %q, err %v", got, err)
	}
	if _, err := validateOperatorCity(false, ""); err == nil {
		t.Fatal("prod empty: want error")
	}
	if got, err := validateOperatorCity(false, "Yerevan"); err != nil || got != "Yerevan" {
		t.Fatalf("prod valid: got %q, err %v", got, err)
	}
}

func TestOriginAllowed(t *testing.T) {
	origins := parseOrigins("https://hayhome.am,https://www.hayhome.am")
	if !originAllowed(origins, "https://hayhome.am") {
		t.Fatal("want allowed")
	}
	if originAllowed(origins, "https://evil.example") {
		t.Fatal("want disallowed")
	}
}
