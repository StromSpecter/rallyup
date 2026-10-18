package handler

import (
	"net/http"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/pkg/httpx"
	"rallyup/server/internal/service"
)

type authResponse struct {
	User        domain.User `json:"user"`
	AccessToken string      `json:"accessToken"`
	ExpiresIn   int         `json:"expiresIn"`
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	user, tokens, err := h.services.Auth.Register(r.Context(), service.RegisterInput{
		Name:     body.Name,
		Email:    body.Email,
		Password: body.Password,
	})
	if err != nil {
		httpx.Error(w, err)
		return
	}

	h.setRefreshCookie(w, tokens.Refresh, int(h.tokens.RefreshTTL().Seconds()))
	httpx.JSON(w, http.StatusCreated, authResponse{
		User:        user,
		AccessToken: tokens.Access,
		ExpiresIn:   int(h.tokens.AccessTTL().Seconds()),
	})
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	user, tokens, err := h.services.Auth.Login(r.Context(), body.Email, body.Password)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	h.setRefreshCookie(w, tokens.Refresh, int(h.tokens.RefreshTTL().Seconds()))
	httpx.JSON(w, http.StatusOK, authResponse{
		User:        user,
		AccessToken: tokens.Access,
		ExpiresIn:   int(h.tokens.AccessTTL().Seconds()),
	})
}

// Refresh membaca refresh token dari cookie httpOnly. Kalau cookie tidak ada,
// klien masih bisa mengirim token di body, berguna untuk aplikasi mobile.
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	raw := ""
	if cookie, err := r.Cookie(refreshCookie); err == nil {
		raw = cookie.Value
	}
	if raw == "" {
		var body struct {
			RefreshToken string `json:"refreshToken"`
		}
		if err := decode(r, &body); err != nil {
			httpx.Error(w, domain.ErrUnauthorized)
			return
		}
		raw = body.RefreshToken
	}
	if raw == "" {
		httpx.Error(w, domain.ErrUnauthorized)
		return
	}

	user, tokens, err := h.services.Auth.Refresh(r.Context(), raw)
	if err != nil {
		h.clearRefreshCookie(w)
		httpx.Error(w, err)
		return
	}

	h.setRefreshCookie(w, tokens.Refresh, int(h.tokens.RefreshTTL().Seconds()))
	httpx.JSON(w, http.StatusOK, authResponse{
		User:        user,
		AccessToken: tokens.Access,
		ExpiresIn:   int(h.tokens.AccessTTL().Seconds()),
	})
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	h.clearRefreshCookie(w)
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	user, err := h.services.Auth.Me(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, user)
}

func (h *Handler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	var body struct {
		Name        string `json:"name"`
		AvatarColor string `json:"avatarColor"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	user, err := h.services.Auth.Update(r.Context(), id, body.Name, body.AvatarColor)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, user)
}
