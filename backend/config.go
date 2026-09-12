package main

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

func parseDevMode(raw string) (bool, error) {
	return parseBool("DEV_MODE", raw)
}

// parseBool разбирает булеву переменную окружения по тем же правилам, что и DEV_MODE:
// пусто/0/false — выключено, 1/true — включено (без учёта регистра и пробелов по краям),
// всё остальное — ошибка конфигурации, а не тихая подстановка значения по умолчанию.
func parseBool(name, raw string) (bool, error) {
	v := strings.ToLower(strings.TrimSpace(raw))
	switch v {
	case "":
		return false, nil
	case "0", "false":
		return false, nil
	case "1", "true":
		return true, nil
	default:
		return false, fmt.Errorf("%s must be one of 1, true, 0, false, or unset; got %q", name, raw)
	}
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	seen := map[string]bool{}
	for _, p := range parts {
		o := strings.TrimRight(strings.TrimSpace(p), "/")
		if o == "" || seen[o] {
			continue
		}
		seen[o] = true
		out = append(out, o)
	}
	return out
}

func originAllowed(origins []string, origin string) bool {
	for _, o := range origins {
		if o == origin {
			return true
		}
	}
	return false
}

func validateOrigins(dev bool, raw string) (string, error) {
	origins := parseOrigins(raw)
	if len(origins) == 0 {
		if dev {
			return "*", nil
		}
		return "", errors.New("CORS_ORIGIN is required when DEV_MODE=0: set a comma-separated list of allowed frontend origins")
	}
	for _, o := range origins {
		if o == "*" {
			if !dev {
				return "", errors.New(`CORS_ORIGIN must not be "*" when DEV_MODE=0: set explicit origin(s)`)
			}
			continue
		}
		u, err := url.Parse(o)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return "", fmt.Errorf("CORS_ORIGIN contains an invalid origin %q", o)
		}
		if u.User != nil || (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" {
			return "", fmt.Errorf("CORS_ORIGIN origin %q must be scheme+host(+port) only, without credentials, path, query, or fragment", o)
		}
	}
	return strings.Join(origins, ","), nil
}

func validatePublicBaseURL(dev bool, raw, port string) (string, error) {
	raw = strings.TrimRight(strings.TrimSpace(raw), "/")
	if raw == "" {
		if dev {
			return "http://localhost:" + port, nil
		}
		return "", errors.New("PUBLIC_BASE_URL is required when DEV_MODE=0: set the public URL of this server")
	}
	u, err := url.Parse(raw)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return "", fmt.Errorf("PUBLIC_BASE_URL is not a valid absolute URL: %q", raw)
	}
	if u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return "", fmt.Errorf("PUBLIC_BASE_URL must not contain credentials, a query, or a fragment: %q", raw)
	}
	if !dev && u.Scheme != "https" {
		return "", fmt.Errorf("PUBLIC_BASE_URL must use https when DEV_MODE=0: %q", raw)
	}
	return raw, nil
}

func validateOperatorEmail(dev bool, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		if dev {
			return "support@hayhome.am", nil
		}
		return "", errors.New("OPERATOR_EMAIL is required when DEV_MODE=0")
	}
	at := strings.IndexByte(raw, '@')
	if at <= 0 || at == len(raw)-1 || strings.ContainsAny(raw, " \t") {
		return "", fmt.Errorf("OPERATOR_EMAIL is not a valid email address: %q", raw)
	}
	return raw, nil
}

func validateOperatorCity(dev bool, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		if dev {
			return "Yerevan", nil
		}
		return "", errors.New("OPERATOR_CITY is required when DEV_MODE=0")
	}
	return raw, nil
}
