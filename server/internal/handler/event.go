package handler

import (
	"net/http"
	"time"

	"github.com/google/uuid"

	"rallyup/server/internal/domain"
	"rallyup/server/internal/pkg/httpx"
	"rallyup/server/internal/service"
)

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	from, err := queryTime(r, "from")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	to, err := queryTime(r, "to")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	filter := domain.ListEventsFilter{
		CommunitySlug: r.URL.Query().Get("communitySlug"),
		Sport:         domain.Sport(r.URL.Query().Get("sport")),
		Query:         r.URL.Query().Get("q"),
		From:          from,
		To:            to,
		Limit:         queryInt(r, "limit", 40),
		Offset:        queryInt(r, "offset", 0),
	}
	if status := r.URL.Query().Get("status"); status != "" {
		filter.Status = []domain.EventStatus{domain.EventStatus(status)}
	}

	switch r.URL.Query().Get("scope") {
	case "mine":
		id, err := userID(r)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		filter.OrganizerID = &id
	case "joined":
		id, err := userID(r)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		filter.ParticipantID = &id
	}

	list, err := h.services.Event.List(r.Context(), filter)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	total, err := h.services.Event.Count(r.Context(), filter)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": list, "total": total})
}

type eventBody struct {
	CommunityID string `json:"communityId"`
	Title       string `json:"title"`
	Sport       string `json:"sport"`
	Format      string `json:"format"`
	Venue       string `json:"venue"`
	City        string `json:"city"`
	StartsAt    string `json:"startsAt"`
	EndsAt      string `json:"endsAt"`
	Capacity    int    `json:"capacity"`
	Fee         int    `json:"fee"`
	LevelMin    int    `json:"levelMin"`
	LevelMax    int    `json:"levelMax"`
	Notes       string `json:"notes"`
	Status      string `json:"status"`
}

// toInput memvalidasi bentuk permintaan (tipe, id, waktu) dan menyerahkan
// aturan isi ke service. Handler tidak mengulang aturan bisnis.
func (b eventBody) toInput() (service.CreateEventInput, service.UpdateEventInput, error) {
	communityID, err := uuid.Parse(b.CommunityID)
	if err != nil {
		return service.CreateEventInput{}, service.UpdateEventInput{}, errInvalid("communityId tidak valid")
	}
	startsAt, err := time.Parse(time.RFC3339, b.StartsAt)
	if err != nil {
		return service.CreateEventInput{}, service.UpdateEventInput{}, errInvalid("startsAt harus format RFC3339")
	}
	endsAt, err := time.Parse(time.RFC3339, b.EndsAt)
	if err != nil {
		return service.CreateEventInput{}, service.UpdateEventInput{}, errInvalid("endsAt harus format RFC3339")
	}

	create := service.CreateEventInput{
		CommunityID: communityID,
		Title:       b.Title,
		Sport:       domain.Sport(b.Sport),
		Format:      domain.EventFormat(b.Format),
		Venue:       b.Venue,
		City:        b.City,
		StartsAt:    startsAt,
		EndsAt:      endsAt,
		Capacity:    b.Capacity,
		Fee:         b.Fee,
		LevelMin:    b.LevelMin,
		LevelMax:    b.LevelMax,
		Notes:       b.Notes,
		Publish:     b.Status != string(domain.EventDraft),
	}
	update := service.UpdateEventInput{CreateEventInput: create, Status: domain.EventStatus(b.Status)}
	return create, update, nil
}

func (h *Handler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body eventBody
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}
	in, _, err := body.toInput()
	if err != nil {
		httpx.Error(w, err)
		return
	}

	event, err := h.services.Event.Create(r.Context(), id, in)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, event)
}

func (h *Handler) GetEvent(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	detail, err := h.services.Event.Detail(r.Context(), eventID, optionalUserID(r))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, detail)
}

func (h *Handler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body eventBody
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}
	_, in, err := body.toInput()
	if err != nil {
		httpx.Error(w, err)
		return
	}

	event, err := h.services.Event.Update(r.Context(), id, eventID, in)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, event)
}

func (h *Handler) JoinEvent(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	registration, err := h.services.Event.Join(r.Context(), id, eventID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, registration)
}

func (h *Handler) LeaveEvent(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	if err := h.services.Event.Leave(r.Context(), id, eventID); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) CancelRegistration(w http.ResponseWriter, r *http.Request) {
	actorID, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	targetID, err := pathUUID(r, "userID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	if err := h.services.Event.CancelRegistration(r.Context(), actorID, eventID, targetID); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) CheckIn(w http.ResponseWriter, r *http.Request) {
	actorID, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	targetID, err := pathUUID(r, "userID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body struct {
		CheckedIn bool `json:"checkedIn"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}

	if err := h.services.Event.CheckIn(r.Context(), actorID, eventID, targetID, body.CheckedIn); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) CheckInAll(w http.ResponseWriter, r *http.Request) {
	actorID, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	if err := h.services.Event.CheckInAll(r.Context(), actorID, eventID); err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (h *Handler) GeneratePairings(w http.ResponseWriter, r *http.Request) {
	actorID, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	var body struct {
		Courts int  `json:"courts"`
		Append bool `json:"append"`
	}
	if err := decode(r, &body); err != nil {
		httpx.Error(w, err)
		return
	}
	if body.Courts < 1 {
		body.Courts = 1
	}

	matches, err := h.services.Event.GeneratePairings(r.Context(), actorID, eventID, body.Courts, body.Append)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"items": matches})
}

func (h *Handler) CloseEvent(w http.ResponseWriter, r *http.Request) {
	actorID, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	event, err := h.services.Event.Close(r.Context(), actorID, eventID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, event)
}

func (h *Handler) EventMatches(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}
	matches, err := h.services.Event.Matches(r.Context(), eventID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"items": matches})
}
