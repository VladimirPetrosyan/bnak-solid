package main

import "time"

// User — учётная запись. Роль определяет вид кабинета на фронтенде.
// PasswordHash/PasswordSalt никогда не уходят в JSON (json:"-") — только для сверки в auth.go.
type User struct {
	ID              string     `json:"id"`
	Phone           string     `json:"phone"`
	Name            string     `json:"name"`
	Role            string     `json:"role"`   // tenant | owner | agency
	Status          string     `json:"status"` // active | blocked
	Ini             string     `json:"ini"`
	CreatedAt       time.Time  `json:"createdAt"`
	PasswordHash    string     `json:"-"`
	PasswordSalt    string     `json:"-"`
	LegalVersion    string     `json:"legalVersion"`
	LegalAcceptedAt *time.Time `json:"legalAcceptedAt,omitempty"`
	LegalLanguage   string     `json:"legalLanguage"`
}

// Admin — супер-пользователь панели управления. Полностью отдельная от User сущность:
// свой логин/пароль, свои сессии (admin_sessions) — обычный пользователь никогда не может
// стать Admin через свой аккаунт. См. admin_auth.go.
type Admin struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

// Listing — объявление. Поля названы так же, как во фронтенд-модели (data.js/LIST),
// чтобы миграция store.js на реальный API была максимально прямолинейной.
type Listing struct {
	ID              string     `json:"id"`
	OwnerID         string     `json:"ownerId"`
	Deal            string     `json:"deal"` // rent | daily | sale | newb | comm
	City            string     `json:"city"`
	District        string     `json:"d"`
	Street          string     `json:"street"`
	Lat             float64    `json:"lat"`
	Lng             float64    `json:"lng"`
	Price           int        `json:"price"`
	Rooms           int        `json:"rooms"`
	Area            int        `json:"area"`
	Floor           int        `json:"fl"`
	FloorsTotal     int        `json:"fls"`
	Features        []string   `json:"f"`
	Description     string     `json:"desc"`
	Deposit         string     `json:"dep"`
	CadastreCode    string     `json:"cadastreCode"`    // защитный код сертификата кадастра — см. README.md
	RepairCondition string     `json:"repairCondition"` // none | needs | cosmetic | good | designer
	Status          string     `json:"status"`          // fresh | aging | due | flagged | archived | rented
	Photos          []string   `json:"photos"`
	ConfirmedAt     time.Time  `json:"confirmedAt"`
	ExpiresAt       time.Time  `json:"expiresAt"` // confirmedAt + 72ч — после этого статус переходит в due/archived
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	PromotedUntil   *time.Time `json:"promotedUntil,omitempty"`
	Promoted        bool       `json:"promoted"`
}

type ListingOutcome struct {
	Source         string    `json:"source"`
	ClosedAt       time.Time `json:"closedAt"`
	SecondsToClose int       `json:"secondsToClose"`
}

type ListingRevision struct {
	ID         string     `json:"id"`
	ListingID  string     `json:"listingId"`
	OwnerID    string     `json:"ownerId"`
	Payload    string     `json:"-"`
	Status     string     `json:"status"`
	CreatedAt  time.Time  `json:"createdAt"`
	ResolvedAt *time.Time `json:"resolvedAt,omitempty"`
	ResolvedBy *string    `json:"resolvedBy,omitempty"`
	Reason     string     `json:"reason,omitempty"`
}

// TokenBalance — баланс внутренних токенов пользователя.
type TokenBalance struct {
	UserID  string `json:"userId"`
	Balance int    `json:"balance"`
}

// TokenTransaction — запись в истории операций с токенами, append-only.
type TokenTransaction struct {
	ID        int64     `json:"id"`
	UserID    string    `json:"userId"`
	Amount    int       `json:"amount"`
	Kind      string    `json:"kind"`
	EventKey  string    `json:"eventKey"`
	ListingID *string   `json:"listingId,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

// Report — жалоба «уже сдана».
type Report struct {
	ID         int64     `json:"id"`
	ListingID  string    `json:"listingId"`
	ReporterID string    `json:"reporterId"`
	Reason     string    `json:"reason"`
	Text       string    `json:"text"`
	Status     string    `json:"status"` // pending | upheld | dismissed
	CreatedAt  time.Time `json:"createdAt"`
}

// Thread — переписка вокруг конкретного объявления между арендатором и владельцем.
type Thread struct {
	ID        string    `json:"id"`
	ListingID string    `json:"listingId"`
	TenantID  string    `json:"tenantId"`
	OwnerID   string    `json:"ownerId"`
	CreatedAt time.Time `json:"createdAt"`
}

// Message — сообщение в треде. Kind различает тип полезной нагрузки.
type Message struct {
	ID        int64      `json:"id"`
	ThreadID  string     `json:"threadId"`
	SenderID  string     `json:"senderId"`
	Kind      string     `json:"kind"` // text | image | video | audio | file | location
	Text      string     `json:"text,omitempty"`
	URL       string     `json:"url,omitempty"`
	Name      string     `json:"name,omitempty"` // имя файла для kind=file
	Size      int64      `json:"size,omitempty"`
	Dur       int        `json:"dur,omitempty"` // длительность голосового, сек
	Lat       float64    `json:"lat,omitempty"`
	Lng       float64    `json:"lng,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	ReadAt    *time.Time `json:"readAt,omitempty"`
}

// SupportMessage — сообщение в переписке пользователя с поддержкой. У пользователя
// ровно один тред поддержки (support_threads.user_id UNIQUE).
type SupportMessage struct {
	ID        int64      `json:"id"`
	ThreadID  string     `json:"threadId"`
	Sender    string     `json:"sender"` // user | admin
	Kind      string     `json:"kind"`   // text | image | video | audio | file | location
	Text      string     `json:"text,omitempty"`
	URL       string     `json:"url,omitempty"`
	Name      string     `json:"name,omitempty"`
	Size      int64      `json:"size,omitempty"`
	Dur       int        `json:"dur,omitempty"`
	Lat       float64    `json:"lat,omitempty"`
	Lng       float64    `json:"lng,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	ReadAt    *time.Time `json:"readAt,omitempty"`
}
