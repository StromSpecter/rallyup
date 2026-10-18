package stream

import (
	"sync"
)

// Message adalah satu kejadian yang dikirim ke klien lewat Server-Sent Events.
// Topic dipakai broker untuk mengarahkan pesan; Name adalah nama kejadian yang
// dibaca klien, dan sengaja dipisah supaya alamat internal tidak bocor ke
// permukaan API.
type Message struct {
	Topic string
	Name  string
	Data  any
}

// EventName mengembalikan nama kejadian untuk klien, dengan Topik sebagai
// cadangan kalau pemanggil tidak menentukan nama.
func (m Message) EventName() string {
	if m.Name != "" {
		return m.Name
	}
	return m.Topic
}

// Broker menyimpan pelanggan per topik di memori. Cukup untuk satu proses API;
// kalau nanti jalan di beberapa replika, ganti bagian Publish dengan pub/sub
// bersama tanpa mengubah pemanggilnya.
type Broker struct {
	mu     sync.RWMutex
	topics map[string]map[*Subscriber]struct{}
}

func NewBroker() *Broker {
	return &Broker{topics: map[string]map[*Subscriber]struct{}{}}
}

type Subscriber struct {
	broker *Broker
	ch     chan Message
	topics []string
	once   sync.Once
}

const bufferSize = 32

func (b *Broker) Subscribe(topics ...string) *Subscriber {
	sub := &Subscriber{
		broker: b,
		ch:     make(chan Message, bufferSize),
		topics: topics,
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	for _, t := range topics {
		if b.topics[t] == nil {
			b.topics[t] = map[*Subscriber]struct{}{}
		}
		b.topics[t][sub] = struct{}{}
	}
	return sub
}

func (s *Subscriber) Messages() <-chan Message { return s.ch }

// Close aman dipanggil dua kali dan dari beberapa goroutine.
func (s *Subscriber) Close() {
	s.once.Do(func() {
		s.broker.mu.Lock()
		defer s.broker.mu.Unlock()
		for _, t := range s.topics {
			delete(s.broker.topics[t], s)
			if len(s.broker.topics[t]) == 0 {
				delete(s.broker.topics, t)
			}
		}
		close(s.ch)
	})
}

// Publish tidak pernah memblokir pengirim. Pelanggan yang lambat kehilangan
// pesan, dan itu pilihan sadar: data terbaru selalu bisa diambil lewat REST.
func (b *Broker) Publish(topic string, data any) {
	b.PublishNamed(topic, "", data)
}

// PublishNamed mengirim pesan dengan nama kejadian khusus untuk klien. Pakailah
// ini supaya nama kejadian yang didengar klien stabil dan tidak mengandung id.
func (b *Broker) PublishNamed(topic, name string, data any) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for sub := range b.topics[topic] {
		select {
		case sub.ch <- Message{Topic: topic, Name: name, Data: data}:
		default:
		}
	}
}

// TopicEvent membangun nama topik untuk satu event.
func TopicEvent(id string) string { return "event:" + id }

// TopicLeaderboard membangun nama topik untuk papan peringkat satu komunitas.
func TopicLeaderboard(communitySlug string, sport string) string {
	return "leaderboard:" + communitySlug + ":" + sport
}

// TopicUser membangun nama topik notifikasi pribadi.
func TopicUser(id string) string { return "user:" + id }
