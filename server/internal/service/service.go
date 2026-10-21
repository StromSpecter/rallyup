package service

// Services mengumpulkan seluruh service supaya perakitan router punya satu
// titik masuk. Setiap service tetap menerima antarmuka yang dibutuhkannya,
// bukan Store utuh.
type Services struct {
	Auth         *AuthService
	Community    *CommunityService
	Event        *EventService
	Score        *ScoreService
	Player       *PlayerService
	Notification *NotificationService
}
