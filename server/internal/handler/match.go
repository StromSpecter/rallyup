package handler

import (
	"net/http"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/pkg/httpx"
)

// GetMatch mengembalikan satu pertandingan beserta sesi induknya. Dipakai
// halaman pertandingan, termasuk ketika dibuka dari tautan notifikasi.
func (h *Handler) GetMatch(w http.ResponseWriter, r *http.Request) {
	matchID, err := pathUUID(r, "matchID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	detail, err := h.services.Score.Detail(r.Context(), matchID, optionalUserID(r))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}

func (h *Handler) SubmitScore(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	matchID, err := pathUUID(r, "matchID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body struct {
		Sets []struct {
			A int `json:"a"`
			B int `json:"b"`
		} `json:"sets"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	sets := make([]domain.SetScore, 0, len(body.Sets))
	for _, s := range body.Sets {
		sets = append(sets, domain.SetScore{A: s.A, B: s.B})
	}

	submission, err := h.services.Score.Submit(r.Context(), id, matchID, sets)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, submission)
}

func (h *Handler) ConfirmScore(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	scoreID, err := pathUUID(r, "scoreID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	submission, err := h.services.Score.Confirm(r.Context(), id, scoreID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, submission)
}

func (h *Handler) DisputeScore(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	scoreID, err := pathUUID(r, "scoreID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}
	if len(body.Reason) < 5 {
		httpx.Error(w, errInvalid("alasan sanggahan minimal 5 karakter"))
		return
	}

	if err := h.services.Score.Dispute(r.Context(), id, scoreID, body.Reason); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) Leaderboard(w http.ResponseWriter, r *http.Request) {
	kind := domain.LeaderboardKind(r.URL.Query().Get("kind"))
	if kind == "" {
		kind = domain.LeaderboardSkill
	}

	board, err := h.services.Leaderboard.Board(r.Context(),
		r.URL.Query().Get("communitySlug"),
		domain.Sport(r.URL.Query().Get("sport")),
		kind,
		queryInt(r, "limit", 50),
	)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, board)
}

func (h *Handler) GetPlayer(w http.ResponseWriter, r *http.Request) {
	playerID, err := pathUUID(r, "userID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	profile, err := h.services.Player.Profile(r.Context(), playerID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	// Halaman pemain terbuka untuk publik, jadi email hanya dikirim ke pemilik
	// akun itu sendiri.
	if viewer := optionalUserID(r); viewer == nil || *viewer != playerID {
		profile.User.Email = ""
	}
	httpx.JSON(w, http.StatusOK, profile)
}

func (h *Handler) PlayerHistory(w http.ResponseWriter, r *http.Request) {
	playerID, err := pathUUID(r, "userID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	matches, err := h.services.Player.History(r.Context(), playerID, queryInt(r, "limit", 20))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": matches})
}

func (h *Handler) ListNotifications(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	items, err := h.services.Notification.List(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) MarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	notificationID, err := pathUUID(r, "notificationID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	if err := h.services.Notification.MarkRead(r.Context(), id, notificationID); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}
