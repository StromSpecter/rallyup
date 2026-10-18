SHELL := /bin/bash

# Muat .env kalau ada, supaya perintah di bawah tidak perlu ekspor manual.
ifneq (,$(wildcard ./.env))
include .env
export
endif

.PHONY: help up down db db-reset migrate seed run-server run-client dev install lint test

help: ## Tampilkan daftar perintah
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependensi client dan server
	cd client && npm install
	cd server && go mod download

up: ## Jalankan Postgres via Docker
	docker compose up -d postgres

down: ## Hentikan Postgres
	docker compose down

db: migrate ## Terapkan semua migrasi

db-reset: ## Hapus database lalu buat ulang dan migrasi
	cd server && go run ./cmd/migrate -reset

migrate: ## Terapkan migrasi yang belum jalan
	cd server && go run ./cmd/migrate

seed: ## Isi database dengan data contoh
	cd server && go run ./cmd/seed

run-server: ## Jalankan API
	cd server && go run ./cmd/api

run-client: ## Jalankan Vite dev server
	cd client && npm run dev

dev: ## Jalankan API dan client bersamaan
	@make --no-print-directory run-server & make --no-print-directory run-client; wait

lint: ## Vet Go dan type-check client
	cd server && go vet ./...
	cd client && npm run typecheck

test: ## Jalankan seluruh test
	cd server && go test ./...
