package main

import "time"

// User — учётная запись. Роль определяет вид кабинета на фронтенде.
// PasswordHash/PasswordSalt никогда не уходят в JSON (json:"-") — только для сверки в auth.go.
type User struct {
	ID              string     `json:"id"`
	Phone           string     `json:"phone"`
	Name            string     `json:"name"`
	Role            string     `json:"role"`   // tenant | owner | agency | hotel
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
	Deal            string     `json:"deal"` // rent | daily | sale | newb | comm | hotel
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
	Videos          []string   `json:"videos"`
	ConfirmedAt     time.Time  `json:"confirmedAt"`
	ExpiresAt       time.Time  `json:"expiresAt"` // confirmedAt + 72ч — после этого статус переходит в due/archived
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	PromotedUntil   *time.Time `json:"promotedUntil,omitempty"`
	Promoted        bool       `json:"promoted"`
	Title           string     `json:"title"`
	StayKind        string     `json:"stayKind"` // hotel | hostel | guesthouse — только для deal=hotel
	CheckIn         string     `json:"checkIn"`
	CheckOut        string     `json:"checkOut"`
}

// RoomType — тип номера в отеле: «Двухместный стандарт, 5 шт.». Available и Total
// заполняются только когда запрошены конкретные даты, см. stays.go stayInfoFor.
type RoomType struct {
	ID        string `json:"id"`
	ListingID string `json:"listingId"`
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	Quantity  int    `json:"quantity"`
	Price     int    `json:"price"`
	Bathroom  string `json:"bathroom"` // private | shared
	Breakfast bool   `json:"breakfast"`
	Available *int   `json:"available,omitempty"`
	Total     int    `json:"total,omitempty"`
}

// StayInfo — сводка по номерам отеля для выдачи и карточки.
type StayInfo struct {
	RoomTypes  []RoomType `json:"roomTypes"`
	Nights     int        `json:"nights"`
	MinNightly int        `json:"minNightly"`
	MinTotal   int        `json:"minTotal"`
	Bookable   bool       `json:"bookable"`
}

// Booking — запрос гостя на бронирование номера. Оплаты нет: отель подтверждает или
// отклоняет запрос, подтверждённая бронь занимает номер на эти ночи.
type Booking struct {
	ID           string     `json:"id"`
	ListingID    string     `json:"listingId"`
	ListingTitle string     `json:"listingTitle"`
	RoomTypeID   string     `json:"roomTypeId"`
	RoomName     string     `json:"roomName"`
	GuestID      string     `json:"guestId"`
	GuestName    string     `json:"guestName"`
	OwnerID      string     `json:"ownerId"`
	ThreadID     string     `json:"threadId"`
	CheckIn      string     `json:"checkIn"`
	CheckOut     string     `json:"checkOut"`
	Guests       int        `json:"guests"`
	Nights       int        `json:"nights"`
	Total        int        `json:"total"`
	Status       string     `json:"status"` // pending | confirmed | declined | cancelled
	CreatedAt    time.Time  `json:"createdAt"`
	DecidedAt    *time.Time `json:"decidedAt,omitempty"`
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

// RoleRequest — заявка пользователя на повышение роли (agency/hotel), требует
// решения модератора/поддержки в админке, не применяется автоматически.
type RoleRequest struct {
	ID         string     `json:"id"`
	UserID     string     `json:"userId"`
	Role       string     `json:"role"`   // agency | hotel
	Status     string     `json:"status"` // pending | approved | rejected
	CreatedAt  time.Time  `json:"createdAt"`
	ResolvedAt *time.Time `json:"resolvedAt,omitempty"`
	ResolvedBy *string    `json:"resolvedBy,omitempty"`
}

// AgencyAgent — контакт в ростере агентства (не отдельный логин, см. agency_agents.go).
type AgencyAgent struct {
	ID        string    `json:"id"`
	AgencyID  string    `json:"agencyId"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	CreatedAt time.Time `json:"createdAt"`
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
	ID         int64      `json:"id"`
	ThreadID   string     `json:"threadId"`
	SenderID   string     `json:"senderId"`
	Kind       string     `json:"kind"`           // text | image | video | audio | file | location | booking
	Text       string     `json:"text,omitempty"` // для kind=booking — событие: request | confirmed | declined | cancelled
	URL        string     `json:"url,omitempty"`
	Name       string     `json:"name,omitempty"` // имя файла для kind=file
	Size       int64      `json:"size,omitempty"`
	Dur        int        `json:"dur,omitempty"` // длительность голосового, сек
	Lat        float64    `json:"lat,omitempty"`
	Lng        float64    `json:"lng,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	ReadAt     *time.Time `json:"readAt,omitempty"`
	BookingID  string     `json:"bookingId,omitempty"`
	Booking    *Booking   `json:"booking,omitempty"`
	Waveform   string     `json:"waveform,omitempty"`   // JSON-массив 0..100 для kind=audio, см. VoiceMessage.jsx
	Transcript string     `json:"transcript,omitempty"` // расшифровка голосового по кнопке, см. speechkit.go
}

// SupportMessage — сообщение в переписке пользователя с поддержкой. У пользователя
// ровно один тред поддержки (support_threads.user_id UNIQUE).
type SupportMessage struct {
	ID         int64      `json:"id"`
	ThreadID   string     `json:"threadId"`
	Sender     string     `json:"sender"` // user | admin
	Kind       string     `json:"kind"`   // text | image | video | audio | file | location
	Text       string     `json:"text,omitempty"`
	URL        string     `json:"url,omitempty"`
	Name       string     `json:"name,omitempty"`
	Size       int64      `json:"size,omitempty"`
	Dur        int        `json:"dur,omitempty"`
	Lat        float64    `json:"lat,omitempty"`
	Lng        float64    `json:"lng,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	ReadAt     *time.Time `json:"readAt,omitempty"`
	Waveform   string     `json:"waveform,omitempty"`
	Transcript string     `json:"transcript,omitempty"`
}
