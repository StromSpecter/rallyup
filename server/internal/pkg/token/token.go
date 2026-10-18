package token

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var ErrExpired = errors.New("token kedaluwarsa")

type Claims struct {
	Kind string `json:"kind"`
	jwt.RegisteredClaims
}

type Pair struct {
	Access  string
	Refresh string
}

type Manager struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func New(secret string, accessTTL, refreshTTL time.Duration) *Manager {
	return &Manager{secret: []byte(secret), accessTTL: accessTTL, refreshTTL: refreshTTL}
}

func (m *Manager) Issue(userID uuid.UUID) (Pair, error) {
	access, err := m.sign(userID, "access", m.accessTTL)
	if err != nil {
		return Pair{}, err
	}
	refresh, err := m.sign(userID, "refresh", m.refreshTTL)
	if err != nil {
		return Pair{}, err
	}
	return Pair{Access: access, Refresh: refresh}, nil
}

// Verify mengembalikan user ID hanya untuk token dengan jenis yang benar.
// Access dan refresh tidak saling substitusi walaupun secret sama.
func (m *Manager) Verify(raw, kind string) (uuid.UUID, error) {
	claims := &Claims{}
	t, err := jwt.ParseWithClaims(raw, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("metode tanda tangan tak dikenal")
		}
		return m.secret, nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return uuid.Nil, ErrExpired
		}
		return uuid.Nil, ErrExpired
	}
	if !t.Valid || claims.Kind != kind {
		return uuid.Nil, ErrExpired
	}
	return uuid.Parse(claims.Subject)
}

func (m *Manager) sign(userID uuid.UUID, kind string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := &Claims{
		Kind: kind,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			ID:        uuid.NewString(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "rallyup",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
}

func (m *Manager) RefreshTTL() time.Duration { return m.refreshTTL }

func (m *Manager) AccessTTL() time.Duration { return m.accessTTL }

// Random menghasilkan token acak untuk keperluan yang tidak butuh verifikasi,
// seperti penanda sesi di log.
func Random() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return ""
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
