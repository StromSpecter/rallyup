package handler

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/middleware"
	"rallyup/server/internal/pkg/httpx"
	"rallyup/server/internal/pkg/token"
	"rallyup/server/internal/service"
	"rallyup/server/internal/stream"
)

// Handler memegang seluruh service dan pengaturan cookie. Satu instance per
// proses, dibuat di server/router.go.
type Handler struct {
	services *service.Services
	tokens   *token.Manager
	broker   *stream.Broker
	secure   bool
}

func New(services *service.Services, tokens *token.Manager, broker *stream.Broker, secure bool) *Handler {
	return &Handler{services: services, tokens: tokens, broker: broker, secure: secure}
}

const refreshCookie = "rallyup_refresh"

func (h *Handler) setRefreshCookie(w http.ResponseWriter, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     refreshCookie,
		Value:    value,
		Path:     "/api/v1/auth",
		MaxAge:   maxAge,
		HttpOnly: true,
		Secure:   h.secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (h *Handler) clearRefreshCookie(w http.ResponseWriter) {
	h.setRefreshCookie(w, "", -1)
}

// userID mengambil identitas pemanggil. Handler yang memakai ini sudah berada
// di balik middleware.Auth, jadi ketiadaan identitas berarti kesalahan program.
func userID(r *http.Request) (uuid.UUID, error) {
	id, ok := middleware.UserFrom(r.Context())
	if !ok {
		return uuid.Nil, fmt.Errorf("%w: sesi tidak ditemukan", domain.ErrUnauthorized)
	}
	return id, nil
}

func optionalUserID(r *http.Request) *uuid.UUID {
	id, ok := middleware.UserFrom(r.Context())
	if !ok {
		return nil
	}
	return &id
}

func pathUUID(r *http.Request, key string) (uuid.UUID, error) {
	raw := chi.URLParam(r, key)
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, fmt.Errorf("%w: %s tidak valid", domain.ErrInvalid, key)
	}
	return id, nil
}

func queryInt(r *http.Request, key string, fallback int) int {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return fallback
	}
	v, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return v
}

func queryTime(r *http.Request, key string) (*time.Time, error) {
	raw := r.URL.Query().Get(key)
	if raw == "" {
		return nil, nil
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err != nil {
		return nil, fmt.Errorf("%w: %s harus format RFC3339", domain.ErrInvalid, key)
	}
	return &t, nil
}

func decode(r *http.Request, dst any) error {
	if err := httpx.Decode(r, dst); err != nil {
		return errInvalid("isi permintaan tidak terbaca: " + err.Error())
	}
	return nil
}

func errInvalid(message string) error {
	return fmt.Errorf("%w: %s", domain.ErrInvalid, message)
}
