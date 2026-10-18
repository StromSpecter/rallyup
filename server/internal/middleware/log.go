package middleware

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
)

type statusRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	n, err := r.ResponseWriter.Write(b)
	r.bytes += n
	return n, err
}

func (r *statusRecorder) Flush() {
	if f, ok := r.ResponseWriter.(http.Flusher); ok {
		f.Flush()
	}
}

// Log mencatat satu baris per permintaan. Setiap permintaan diberi request ID
// supaya satu alur bisa ditelusuri di log.
func Log(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			requestID := uuid.NewString()
			w.Header().Set("X-Request-Id", requestID)

			rec := &statusRecorder{ResponseWriter: w}
			next.ServeHTTP(rec, r)

			logger.Info("permintaan",
				"id", requestID,
				"method", r.Method,
				"path", r.URL.Path,
				"status", rec.status,
				"bytes", rec.bytes,
				"durasi", time.Since(start).Round(time.Millisecond).String(),
			)
		})
	}
}

// Recover mengubah panic menjadi respons 500 supaya satu handler yang gagal
// tidak menjatuhkan seluruh proses.
func Recover(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					logger.Error("panic tertangkap", "path", r.URL.Path, "nilai", rec)
					w.Header().Set("Content-Type", "application/json; charset=utf-8")
					w.WriteHeader(http.StatusInternalServerError)
					_, _ = w.Write([]byte(`{"code":"internal","message":"terjadi kesalahan di server"}`))
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
