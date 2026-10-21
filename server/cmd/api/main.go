package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"rallyup/server/internal/config"
	"rallyup/server/internal/handler"
	"rallyup/server/internal/pkg/token"
	"rallyup/server/internal/repo"
	"rallyup/server/internal/server"
	"rallyup/server/internal/service"
	"rallyup/server/internal/stream"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("konfigurasi gagal dibaca", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("pool database gagal dibuat", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		logger.Error("database tidak terjangkau", "error", err)
		os.Exit(1)
	}

	store := repo.NewStore(pool)
	broker := stream.NewBroker()
	tokens := token.New(cfg.JWTSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL)

	notifications := service.NewNotificationService(store.Notifications, broker)
	services := &service.Services{
		Auth:      service.NewAuthService(store.Users, tokens),
		Community: service.NewCommunityService(store.Communities),
		Event: service.NewEventService(store.Events, store.Communities, store.Registrations,
			store.Matches, store.Ratings, notifications, store.Audit, broker),
		Score: service.NewScoreService(store.Scores, store.Matches, store.Events,
			store.Communities, store.Ratings, notifications, store.Audit, broker),
		Player:       service.NewPlayerService(store.Ratings, store.Matches),
		Notification: notifications,
	}

	h := handler.New(services, tokens, broker, cfg.Env == "production")
	router := server.NewRouter(cfg, logger, h, tokens)

	srv := &http.Server{
		Addr:    cfg.Addr,
		Handler: router,
		// WriteTimeout sengaja nol: koneksi SSE hidup lama dan tidak boleh
		// diputus oleh batas waktu tulis.
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		logger.Info("API siap", "alamat", cfg.Addr, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server berhenti tak terduga", "error", err)
			stop()
		}
	}()

	<-ctx.Done()
	logger.Info("mematikan server")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown gagal", "error", err)
	}
}
