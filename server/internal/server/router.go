package server

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"rallyup/server/internal/config"
	"rallyup/server/internal/handler"
	"rallyup/server/internal/middleware"
	"rallyup/server/internal/pkg/token"
)

// NewRouter menyusun seluruh rute. Satu tempat untuk melihat bentuk API,
// tanpa perlu membuka berkas handler.
func NewRouter(cfg *config.Config, logger *slog.Logger, h *handler.Handler, tokens *token.Manager) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recover(logger))
	r.Use(middleware.Log(logger))
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(chimw.RealIP)

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", h.Register)
			r.Post("/login", h.Login)
			r.Post("/refresh", h.Refresh)
			r.Post("/logout", h.Logout)
		})

		// Rute publik masih menerima identitas kalau token dikirim, supaya
		// responsnya bisa menyesuaikan pengunjung yang sudah masuk.
		r.Group(func(r chi.Router) {
			r.Use(middleware.OptionalAuth(tokens))

			r.Get("/communities", h.ListCommunities)
			r.Get("/communities/{slug}", h.GetCommunity)
			r.Get("/events", h.ListEvents)
			r.Get("/events/{eventID}", h.GetEvent)
			r.Get("/events/{eventID}/matches", h.EventMatches)
			r.Get("/leaderboard", h.Leaderboard)
			r.Get("/players/{userID}", h.GetPlayer)
			r.Get("/players/{userID}/matches", h.PlayerHistory)
			r.Get("/matches/{matchID}", h.GetMatch)
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(tokens))

			r.Get("/me", h.Me)
			r.Patch("/me", h.UpdateMe)

			r.Post("/communities", h.CreateCommunity)
			r.Patch("/communities/{slug}", h.UpdateCommunity)
			r.Post("/communities/{slug}/join", h.JoinCommunity)

			r.Post("/events", h.CreateEvent)
			r.Patch("/events/{eventID}", h.UpdateEvent)
			r.Post("/events/{eventID}/join", h.JoinEvent)
			r.Post("/events/{eventID}/leave", h.LeaveEvent)
			r.Post("/events/{eventID}/registrations/{userID}/check-in", h.CheckIn)
			r.Post("/events/{eventID}/pairings", h.GeneratePairings)
			r.Post("/events/{eventID}/close", h.CloseEvent)

			r.Post("/matches/{matchID}/score", h.SubmitScore)
			r.Post("/matches/{matchID}/score/{scoreID}/confirm", h.ConfirmScore)
			r.Post("/matches/{matchID}/score/{scoreID}/dispute", h.DisputeScore)

			r.Get("/notifications", h.ListNotifications)
			r.Post("/notifications/{notificationID}/read", h.MarkNotificationRead)

			r.Get("/stream/me", h.StreamMe)
		})

		// Stream publik tidak butuh identitas karena datanya memang publik.
		r.Group(func(r chi.Router) {
			r.Get("/stream/events/{eventID}", h.StreamEvent)
			r.Get("/stream/leaderboard", h.StreamLeaderboard)
		})
	})

	return r
}
