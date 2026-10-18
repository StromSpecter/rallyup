package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config adalah seluruh pengaturan yang dibaca dari environment.
// Satu pemanggilan Load() di awal proses, lalu nilai disebar lewat dependency injection.
type Config struct {
	Env         string
	Addr        string
	DatabaseURL string

	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	CORSOrigins []string
}

func Load() (*Config, error) {
	secret := os.Getenv("RALLYUP_JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("RALLYUP_JWT_SECRET wajib diisi")
	}

	cfg := &Config{
		Env:             envOr("RALLYUP_ENV", "development"),
		Addr:            envOr("RALLYUP_ADDR", ":8080"),
		DatabaseURL:     os.Getenv("RALLYUP_DATABASE_URL"),
		JWTSecret:       secret,
		AccessTokenTTL:  durationOr("RALLYUP_ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL: durationOr("RALLYUP_REFRESH_TOKEN_TTL", 14*24*time.Hour),
		CORSOrigins:     splitCSV(os.Getenv("RALLYUP_CORS_ORIGINS"), "http://localhost:5173"),
	}

	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("RALLYUP_DATABASE_URL wajib diisi")
	}
	return cfg, nil
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func durationOr(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}

func splitCSV(raw string, fallback string) []string {
	if raw == "" {
		raw = fallback
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
