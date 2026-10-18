package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"rallyup/server/internal/pkg/httpx"
	"rallyup/server/internal/service"
)

func (h *Handler) ListCommunities(w http.ResponseWriter, r *http.Request) {
	list, err := h.services.Community.List(r.Context(), optionalUserID(r))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": list})
}

func (h *Handler) CreateCommunity(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body struct {
		Name        string `json:"name"`
		City        string `json:"city"`
		Description string `json:"description"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	community, err := h.services.Community.Create(r.Context(), id, service.CreateCommunityInput{
		Name:        body.Name,
		City:        body.City,
		Description: body.Description,
	})
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, community)
}

// GetCommunity mengembalikan komunitas beserta peran pemanggil, supaya klien
// tahu apakah ia boleh mengelola sesi di dalamnya.
func (h *Handler) GetCommunity(w http.ResponseWriter, r *http.Request) {
	community, role, err := h.services.Community.Get(r.Context(), chi.URLParam(r, "slug"), optionalUserID(r))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"community": community,
		"myRole":    role,
	})
}

func (h *Handler) UpdateCommunity(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	slug := chi.URLParam(r, "slug")
	var body struct {
		Name        string `json:"name"`
		City        string `json:"city"`
		Description string `json:"description"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	community, err := h.services.Community.Update(r.Context(), slug, id, body.Name, body.City, body.Description)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, community)
}

func (h *Handler) JoinCommunity(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	community, err := h.services.Community.Join(r.Context(), chi.URLParam(r, "slug"), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, community)
}
