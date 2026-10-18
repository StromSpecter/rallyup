package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"rallyup/server/internal/pkg/httpx"
	"rallyup/server/internal/pkg/token"
)

type contextKey string

const (
	userIDKey contextKey = "userID"
)

// Auth memvalidasi access token. Token dibaca dari header Authorization, dan
// juga dari query access_token karena EventSource tidak bisa mengirim header.
func Auth(tokens *token.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw := bearer(r)
			if raw == "" {
				raw = r.URL.Query().Get("access_token")
			}
			if raw == "" {
				httpx.JSON(w, http.StatusUnauthorized, httpx.ErrorResponse{
					Code: "unauthorized", Message: "token tidak ditemukan",
				})
				return
			}

			userID, err := tokens.Verify(raw, "access")
			if err != nil {
				httpx.JSON(w, http.StatusUnauthorized, httpx.ErrorResponse{
					Code: "unauthorized", Message: "token tidak valid atau kedaluwarsa",
				})
				return
			}
			next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), userID)))
		})
	}
}

// OptionalAuth membaca token kalau ada, dan meneruskan permintaan tanpa
// identitas kalau tidak ada. Dipakai oleh halaman publik yang menampilkan
// data berbeda untuk pengunjung yang sudah masuk.
func OptionalAuth(tokens *token.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if raw := bearer(r); raw != "" {
				if userID, err := tokens.Verify(raw, "access"); err == nil {
					r = r.WithContext(WithUser(r.Context(), userID))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func WithUser(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id)
}

// UserFrom mengembalikan identitas pemanggil. Boolean false berarti permintaan
// anonim.
func UserFrom(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

func bearer(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return strings.TrimSpace(parts[1])
}
