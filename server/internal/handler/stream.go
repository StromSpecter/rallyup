package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"rallyup/server/internal/pkg/httpx"
	"rallyup/server/internal/stream"
)

// heartbeat menjaga koneksi tetap hidup melewati proxy dan load balancer yang
// memutus koneksi diam. Nilainya di bawah batas umum 60 detik.
const heartbeat = 25 * time.Second

// StreamEvent mengirim pembaruan satu sesi: jumlah peserta, absen, skor, dan
// jadwal baru. Halaman detail sesi berlangganan ke sini.
func (h *Handler) StreamEvent(w http.ResponseWriter, r *http.Request) {
	eventID, err := pathUUID(r, "eventID")
	if err != nil {
		httpx.Error(w, err)
		return
	}

	// Pastikan sesinya ada sebelum membuka koneksi panjang, supaya kesalahan
	// tetap tampil sebagai respons JSON biasa.
	if _, err := h.services.Event.Matches(r.Context(), eventID); err != nil {
		httpx.Error(w, err)
		return
	}

	sub := h.broker.Subscribe(stream.TopicEvent(eventID.String()))
	h.serveStream(w, r, sub)
}

// StreamMe mengirim notifikasi pribadi pemanggil.
func (h *Handler) StreamMe(w http.ResponseWriter, r *http.Request) {
	id, err := userID(r)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	sub := h.broker.Subscribe(stream.TopicUser(id.String()))
	h.serveStream(w, r, sub)
}

// serveStream menulis balasan SSE sampai klien pergi. Seluruh penulisan terjadi
// di satu goroutine; broker sudah menyalurkan pesan lewat channel.
func (h *Handler) serveStream(w http.ResponseWriter, r *http.Request, sub *stream.Subscriber) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming tidak didukung", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache, no-transform")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	defer sub.Close()

	// Klien diberi tahu interval heartbeat agar proxy hulu tidak menutup
	// koneksi selama jeda.
	fmt.Fprintf(w, "retry: 3000\n\n")
	flusher.Flush()

	ticker := time.NewTicker(heartbeat)
	defer ticker.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case <-ticker.C:
			fmt.Fprintf(w, ": ping %d\n\n", time.Now().Unix())
			flusher.Flush()
		case msg, ok := <-sub.Messages():
			if !ok {
				return
			}
			payload, err := json.Marshal(msg.Data)
			if err != nil {
				continue
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", msg.EventName(), payload)
			flusher.Flush()
		}
	}
}
