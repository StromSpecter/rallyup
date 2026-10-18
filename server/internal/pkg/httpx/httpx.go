package httpx

import (
	"encoding/json"
	"errors"
	"net/http"

	"rallyup/server/internal/domain"
)

// ErrorResponse adalah bentuk tunggal seluruh kegagalan API. Klien cukup
// membaca `message` untuk ditampilkan, `code` untuk percabangan.
type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

func Error(w http.ResponseWriter, err error) {
	status, code, message := Map(err)
	JSON(w, status, ErrorResponse{Code: code, Message: message})
}

func BadRequest(w http.ResponseWriter, message string) {
	JSON(w, http.StatusBadRequest, ErrorResponse{Code: "bad_request", Message: message})
}

func Decode(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}

func Map(err error) (status int, code, message string) {
	switch {
	case errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, "not_found", err.Error()
	case errors.Is(err, domain.ErrConflict):
		return http.StatusConflict, "conflict", err.Error()
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, "unauthorized", err.Error()
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, "forbidden", err.Error()
	case errors.Is(err, domain.ErrFull):
		return http.StatusConflict, "full", err.Error()
	case errors.Is(err, domain.ErrInvalidState):
		return http.StatusConflict, "invalid_state", err.Error()
	case errors.Is(err, domain.ErrInvalid):
		return http.StatusBadRequest, "invalid", err.Error()
	default:
		return http.StatusInternalServerError, "internal", "terjadi kesalahan di server"
	}
}
