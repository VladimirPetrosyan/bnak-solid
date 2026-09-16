package main

import (
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

// Отели и хостелы — объявления с deal='hotel'. Номера заводятся типами (room_types),
// владелец закрывает отдельные дни (room_closures), гость отправляет запрос на
// бронирование (booking_requests), отель подтверждает или отклоняет его прямо в чате.
// Свободно на ночь = quantity − подтверждённые брони на эту ночь; закрытая ночь — ноль.
// Запрос в ожидании номер не занимает: иначе любой мог бы «забить» отель запросами.

type dbtx interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
}

const (
	dayLayout     = "2006-01-02"
	maxStayNights = 30
	maxGuests     = 50
)

var (
	errStayDates       = errors.New("invalid_dates")
	errStayGuests      = errors.New("invalid_guests")
	errNotHotel        = errors.New("not_hotel")
	errRoomInvalid     = errors.New("invalid_room")
	errRoomNotFound    = errors.New("room_not_found")
	errRoomHasBookings = errors.New("room_has_bookings")
	errNotAvailable    = errors.New("not_available")
	errTooManyGuests   = errors.New("too_many_guests")
	errOwnBooking      = errors.New("cannot_book_own")
	errBookingNotFound = errors.New("booking_not_found")
	errBookingState    = errors.New("booking_not_pending")
)

type stayQuery struct {
	days   []string
	guests int
}

// ---------- даты ----------

func nightDays(in, out time.Time) []string {
	var days []string
	for d := in; d.Before(out); d = d.AddDate(0, 0, 1) {
		days = append(days, d.Format(dayLayout))
	}
	return days
}

// stayNights — ночи между заездом и выездом (выезд не входит). Заезд не в прошлом,
// от 1 до maxStayNights ночей.
func stayNights(checkIn, checkOut string, now time.Time) ([]string, error) {
	in, err := time.Parse(dayLayout, checkIn)
	if err != nil {
		return nil, errStayDates
	}
	out, err := time.Parse(dayLayout, checkOut)
	if err != nil {
		return nil, errStayDates
	}
	today, _ := time.Parse(dayLayout, now.Format(dayLayout))
	if in.Before(today) || !out.After(in) || out.After(in.AddDate(0, 0, maxStayNights)) {
		return nil, errStayDates
	}
	return nightDays(in, out), nil
}

func parseStayQuery(q url.Values, now time.Time) (stayQuery, error) {
	var s stayQuery
	checkIn, checkOut := q.Get("checkIn"), q.Get("checkOut")
	if checkIn != "" || checkOut != "" {
		days, err := stayNights(checkIn, checkOut, now)
		if err != nil {
			return s, err
		}
		s.days = days
	}
	if g := q.Get("guests"); g != "" {
		n, err := strconv.Atoi(g)
		if err != nil || n < 1 || n > maxGuests {
			return s, errStayGuests
		}
		s.guests = n
	}
	return s, nil
}

// ---------- номера и наличие ----------

const roomCols = `id, listing_id, name, capacity, quantity, price, bathroom, breakfast`

func scanRoom(row interface{ Scan(...any) error }) (RoomType, error) {
	var r RoomType
	err := row.Scan(&r.ID, &r.ListingID, &r.Name, &r.Capacity, &r.Quantity, &r.Price, &r.Bathroom, &r.Breakfast)
	return r, err
}

func loadRoomTypes(q dbtx, listingID string) ([]RoomType, error) {
	rows, err := q.Query(`SELECT `+roomCols+` FROM room_types WHERE listing_id = ? ORDER BY position, created_at`, listingID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RoomType{}
	for rows.Next() {
		r, err := scanRoom(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func loadRoomType(q dbtx, listingID, roomID string) (RoomType, error) {
	r, err := scanRoom(q.QueryRow(`SELECT `+roomCols+` FROM room_types WHERE id = ? AND listing_id = ?`, roomID, listingID))
	if errors.Is(err, sql.ErrNoRows) {
		return r, errRoomNotFound
	}
	return r, err
}

// bookedPerDay — сколько подтверждённых броней приходится на каждую ночь в [from, to).
func bookedPerDay(q dbtx, roomID, from, to string) (map[string]int, error) {
	rows, err := q.Query(`SELECT check_in, check_out FROM booking_requests
		WHERE room_type_id = ? AND status = 'confirmed' AND check_in < ? AND check_out > ?`, roomID, to, from)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	booked := map[string]int{}
	for rows.Next() {
		var checkIn, checkOut string
		if err := rows.Scan(&checkIn, &checkOut); err != nil {
			return nil, err
		}
		start, _ := time.Parse(dayLayout, max(checkIn, from))
		end, _ := time.Parse(dayLayout, min(checkOut, to))
		for _, d := range nightDays(start, end) {
			booked[d]++
		}
	}
	return booked, rows.Err()
}

func nextDay(day string) string {
	d, _ := time.Parse(dayLayout, day)
	return d.AddDate(0, 0, 1).Format(dayLayout)
}

// roomAvailable — сколько номеров этого типа свободно на все ночи days сразу.
func roomAvailable(q dbtx, room RoomType, days []string) (int, error) {
	if len(days) == 0 {
		return room.Quantity, nil
	}
	first, last := days[0], days[len(days)-1]
	var closed int
	if err := q.QueryRow(`SELECT COUNT(*) FROM room_closures WHERE room_type_id = ? AND day >= ? AND day <= ?`,
		room.ID, first, last).Scan(&closed); err != nil {
		return 0, err
	}
	if closed > 0 {
		return 0, nil
	}
	booked, err := bookedPerDay(q, room.ID, first, nextDay(last))
	if err != nil {
		return 0, err
	}
	peak := 0
	for _, d := range days {
		peak = max(peak, booked[d])
	}
	return max(0, room.Quantity-peak), nil
}

func stayInfoFor(q dbtx, listingID string, s stayQuery) (StayInfo, error) {
	rooms, err := loadRoomTypes(q, listingID)
	if err != nil {
		return StayInfo{}, err
	}
	info := StayInfo{RoomTypes: rooms, Nights: len(s.days)}
	for i := range info.RoomTypes {
		r := &info.RoomTypes[i]
		if len(s.days) > 0 {
			n, err := roomAvailable(q, *r, s.days)
			if err != nil {
				return StayInfo{}, err
			}
			r.Available = &n
			r.Total = r.Price * len(s.days)
		}
		if s.guests > r.Capacity || (r.Available != nil && *r.Available == 0) {
			continue
		}
		info.Bookable = true
		if info.MinNightly == 0 || r.Price < info.MinNightly {
			info.MinNightly = r.Price
		}
		if r.Total > 0 && (info.MinTotal == 0 || r.Total < info.MinTotal) {
			info.MinTotal = r.Total
		}
	}
	return info, nil
}

// syncHotelPrice держит listings.price = самая низкая цена за ночь и listings.rooms = число
// типов номеров — так у отелей работают сортировка по цене, фильтр и карта.
func syncHotelPrice(q dbtx, listingID string) error {
	_, err := q.Exec(`UPDATE listings SET
		price = COALESCE((SELECT MIN(price) FROM room_types WHERE listing_id = ?), 0),
		rooms = (SELECT COUNT(*) FROM room_types WHERE listing_id = ?)
		WHERE id = ? AND deal = 'hotel'`, listingID, listingID, listingID)
	return err
}

// ---------- GET /api/listings/{id}/rooms ----------

func handleListRooms(w http.ResponseWriter, r *http.Request) {
	var deal string
	err := db.QueryRow(`SELECT deal FROM listings WHERE id = ?`, r.PathValue("id")).Scan(&deal)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if deal != "hotel" {
		writeErr(w, http.StatusBadRequest, errNotHotel.Error())
		return
	}
	stay, err := parseStayQuery(r.URL.Query(), time.Now())
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	info, err := stayInfoFor(db, r.PathValue("id"), stay)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, info)
}

// ---------- управление номерами (владелец) ----------

type roomInput struct {
	Name      string `json:"name"`
	Capacity  int    `json:"capacity"`
	Quantity  int    `json:"quantity"`
	Price     int    `json:"price"`
	Bathroom  string `json:"bathroom"`
	Breakfast bool   `json:"breakfast"`
}

func validateRoomInput(in roomInput) (roomInput, error) {
	in.Name = normalizeSpaces(in.Name)
	if in.Bathroom == "" {
		in.Bathroom = "private"
	}
	if in.Name == "" || len([]rune(in.Name)) > 80 ||
		in.Capacity < 1 || in.Capacity > maxGuests ||
		in.Quantity < 1 || in.Quantity > 500 ||
		in.Price < 1 || in.Price > 100_000_000 ||
		(in.Bathroom != "private" && in.Bathroom != "shared") {
		return in, errRoomInvalid
	}
	return in, nil
}

func hotelOr403(w http.ResponseWriter, r *http.Request) (*Listing, bool) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return nil, false
	}
	if l.Deal != "hotel" {
		writeErr(w, http.StatusBadRequest, errNotHotel.Error())
		return nil, false
	}
	return l, true
}

func readRoomInput(w http.ResponseWriter, r *http.Request) (roomInput, bool) {
	var in roomInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return in, false
	}
	in, err := validateRoomInput(in)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return in, false
	}
	return in, true
}

func handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	l, ok := hotelOr403(w, r)
	if !ok {
		return
	}
	in, ok := readRoomInput(w, r)
	if !ok {
		return
	}
	id := newID()
	if _, err := db.Exec(`INSERT INTO room_types(id, listing_id, name, capacity, quantity, price, bathroom, breakfast, position)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM room_types WHERE listing_id = ?))`,
		id, l.ID, in.Name, in.Capacity, in.Quantity, in.Price, in.Bathroom, in.Breakfast, l.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if err := syncHotelPrice(db, l.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	room, err := loadRoomType(db, l.ID, id)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusCreated, room)
}

func handleUpdateRoom(w http.ResponseWriter, r *http.Request) {
	l, ok := hotelOr403(w, r)
	if !ok {
		return
	}
	in, ok := readRoomInput(w, r)
	if !ok {
		return
	}
	res, err := db.Exec(`UPDATE room_types SET name=?, capacity=?, quantity=?, price=?, bathroom=?, breakfast=?
		WHERE id = ? AND listing_id = ?`,
		in.Name, in.Capacity, in.Quantity, in.Price, in.Bathroom, in.Breakfast, r.PathValue("roomId"), l.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeErr(w, http.StatusNotFound, errRoomNotFound.Error())
		return
	}
	if err := syncHotelPrice(db, l.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	room, err := loadRoomType(db, l.ID, r.PathValue("roomId"))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, room)
}

func handleDeleteRoom(w http.ResponseWriter, r *http.Request) {
	l, ok := hotelOr403(w, r)
	if !ok {
		return
	}
	roomID := r.PathValue("roomId")
	var active int
	if err := db.QueryRow(`SELECT COUNT(*) FROM booking_requests
		WHERE room_type_id = ? AND status IN ('pending', 'confirmed') AND check_out > ?`,
		roomID, time.Now().Format(dayLayout)).Scan(&active); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if active > 0 {
		writeErr(w, http.StatusConflict, errRoomHasBookings.Error())
		return
	}
	res, err := db.Exec(`DELETE FROM room_types WHERE id = ? AND listing_id = ?`, roomID, l.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		writeErr(w, http.StatusNotFound, errRoomNotFound.Error())
		return
	}
	if err := syncHotelPrice(db, l.ID); err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- календарь номера ----------

type calendarDay struct {
	Day       string `json:"day"`
	Closed    bool   `json:"closed"`
	Booked    int    `json:"booked"`
	Available int    `json:"available"`
}

func roomCalendar(q dbtx, room RoomType, month time.Time) ([]calendarDay, error) {
	from := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	to := from.AddDate(0, 1, 0)
	days := nightDays(from, to)

	rows, err := q.Query(`SELECT day FROM room_closures WHERE room_type_id = ? AND day >= ? AND day < ?`,
		room.ID, days[0], to.Format(dayLayout))
	if err != nil {
		return nil, err
	}
	closed := map[string]bool{}
	for rows.Next() {
		var d string
		if rows.Scan(&d) == nil {
			closed[d] = true
		}
	}
	rows.Close()

	booked, err := bookedPerDay(q, room.ID, days[0], to.Format(dayLayout))
	if err != nil {
		return nil, err
	}
	out := make([]calendarDay, len(days))
	for i, d := range days {
		avail := max(0, room.Quantity-booked[d])
		if closed[d] {
			avail = 0
		}
		out[i] = calendarDay{Day: d, Closed: closed[d], Booked: booked[d], Available: avail}
	}
	return out, nil
}

func handleRoomCalendar(w http.ResponseWriter, r *http.Request) {
	l, ok := hotelOr403(w, r)
	if !ok {
		return
	}
	room, err := loadRoomType(db, l.ID, r.PathValue("roomId"))
	if errors.Is(err, errRoomNotFound) {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	month := time.Now()
	if m := r.URL.Query().Get("month"); m != "" {
		if month, err = time.Parse("2006-01", m); err != nil {
			writeErr(w, http.StatusBadRequest, errStayDates.Error())
			return
		}
	}
	days, err := roomCalendar(db, room, month)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"room": room, "month": month.Format("2006-01"), "days": days})
}

type closuresInput struct {
	Days   []string `json:"days"`
	Closed bool     `json:"closed"`
}

func setRoomClosures(roomID string, in closuresInput) error {
	if len(in.Days) == 0 || len(in.Days) > 366 {
		return errStayDates
	}
	for _, d := range in.Days {
		if _, err := time.Parse(dayLayout, d); err != nil {
			return errStayDates
		}
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	query := `DELETE FROM room_closures WHERE room_type_id = ? AND day = ?`
	if in.Closed {
		query = `INSERT OR IGNORE INTO room_closures(room_type_id, day) VALUES (?, ?)`
	}
	for _, d := range in.Days {
		if _, err := tx.Exec(query, roomID, d); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func handleSetClosures(w http.ResponseWriter, r *http.Request) {
	l, ok := hotelOr403(w, r)
	if !ok {
		return
	}
	room, err := loadRoomType(db, l.ID, r.PathValue("roomId"))
	if errors.Is(err, errRoomNotFound) {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	var in closuresInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	switch err := setRoomClosures(room.ID, in); {
	case errors.Is(err, errStayDates):
		writeErr(w, http.StatusBadRequest, err.Error())
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

// ---------- брони ----------

const bookingCols = `b.id, b.listing_id, l.title, b.room_type_id, b.room_name, b.guest_id, u.name, b.owner_id, b.thread_id,
	b.check_in, b.check_out, b.guests, b.nights, b.total, b.status, b.created_at, b.decided_at`

const bookingFrom = ` FROM booking_requests b JOIN listings l ON l.id = b.listing_id JOIN users u ON u.id = b.guest_id`

func scanBooking(row interface{ Scan(...any) error }) (*Booking, error) {
	var b Booking
	var decided sql.NullTime
	err := row.Scan(&b.ID, &b.ListingID, &b.ListingTitle, &b.RoomTypeID, &b.RoomName, &b.GuestID, &b.GuestName, &b.OwnerID,
		&b.ThreadID, &b.CheckIn, &b.CheckOut, &b.Guests, &b.Nights, &b.Total, &b.Status, &b.CreatedAt, &decided)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errBookingNotFound
	}
	if err != nil {
		return nil, err
	}
	if decided.Valid {
		b.DecidedAt = &decided.Time
	}
	return &b, nil
}

func loadBooking(q dbtx, id string) (*Booking, error) {
	return scanBooking(q.QueryRow(`SELECT `+bookingCols+bookingFrom+` WHERE b.id = ?`, id))
}

type bookingInput struct {
	RoomTypeID string `json:"roomTypeId"`
	CheckIn    string `json:"checkIn"`
	CheckOut   string `json:"checkOut"`
	Guests     int    `json:"guests"`
}

func createBooking(guestID, listingID string, in bookingInput, now time.Time) (*Booking, Message, *Thread, error) {
	days, err := stayNights(in.CheckIn, in.CheckOut, now)
	if err != nil {
		return nil, Message{}, nil, err
	}
	tx, err := db.Begin()
	if err != nil {
		return nil, Message{}, nil, err
	}
	defer tx.Rollback()

	var ownerID, deal, status string
	err = tx.QueryRow(`SELECT owner_id, deal, status FROM listings WHERE id = ?`, listingID).Scan(&ownerID, &deal, &status)
	switch {
	case errors.Is(err, sql.ErrNoRows):
		return nil, Message{}, nil, errListingNotFound
	case err != nil:
		return nil, Message{}, nil, err
	case deal != "hotel":
		return nil, Message{}, nil, errNotHotel
	case status != "active":
		return nil, Message{}, nil, errListingNotActive
	case ownerID == guestID:
		return nil, Message{}, nil, errOwnBooking
	}

	room, err := loadRoomType(tx, listingID, in.RoomTypeID)
	if err != nil {
		return nil, Message{}, nil, err
	}
	if in.Guests < 1 {
		return nil, Message{}, nil, errStayGuests
	}
	if in.Guests > room.Capacity {
		return nil, Message{}, nil, errTooManyGuests
	}
	avail, err := roomAvailable(tx, room, days)
	if err != nil {
		return nil, Message{}, nil, err
	}
	if avail == 0 {
		return nil, Message{}, nil, errNotAvailable
	}

	threadID, err := ensureThread(tx, listingID, guestID, ownerID)
	if err != nil {
		return nil, Message{}, nil, err
	}
	id := newID()
	if _, err := tx.Exec(`INSERT INTO booking_requests
		(id, listing_id, room_type_id, room_name, guest_id, owner_id, thread_id, check_in, check_out, guests, nights, total, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
		id, listingID, room.ID, room.Name, guestID, ownerID, threadID, in.CheckIn, in.CheckOut, in.Guests, len(days), room.Price*len(days), now); err != nil {
		return nil, Message{}, nil, err
	}
	m, err := insertBookingMessage(tx, threadID, guestID, id, "request")
	if err != nil {
		return nil, Message{}, nil, err
	}
	b, err := loadBooking(tx, id)
	if err != nil {
		return nil, Message{}, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, Message{}, nil, err
	}
	m.Booking = b
	return b, m, &Thread{ID: threadID, ListingID: listingID, TenantID: guestID, OwnerID: ownerID}, nil
}

// changeBooking переводит запрос из pending в confirmed/declined (отель) или cancelled (гость)
// и пишет об этом сообщение в тред. Подтверждение ещё раз проверяет, что номер свободен —
// за время ожидания отель мог подтвердить другую бронь или закрыть даты.
func changeBooking(userID, bookingID, status string, now time.Time) (*Booking, Message, *Thread, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, Message{}, nil, err
	}
	defer tx.Rollback()

	b, err := loadBooking(tx, bookingID)
	if err != nil {
		return nil, Message{}, nil, err
	}
	actor := b.OwnerID
	if status == "cancelled" {
		actor = b.GuestID
	}
	if userID != actor {
		return nil, Message{}, nil, errNotOwner
	}
	if b.Status != "pending" {
		return nil, Message{}, nil, errBookingState
	}
	if status == "confirmed" {
		room, err := loadRoomType(tx, b.ListingID, b.RoomTypeID)
		if err != nil {
			return nil, Message{}, nil, err
		}
		in, _ := time.Parse(dayLayout, b.CheckIn)
		out, _ := time.Parse(dayLayout, b.CheckOut)
		avail, err := roomAvailable(tx, room, nightDays(in, out))
		if err != nil {
			return nil, Message{}, nil, err
		}
		if avail == 0 {
			return nil, Message{}, nil, errNotAvailable
		}
	}
	if _, err := tx.Exec(`UPDATE booking_requests SET status = ?, decided_at = ? WHERE id = ?`, status, now, b.ID); err != nil {
		return nil, Message{}, nil, err
	}
	m, err := insertBookingMessage(tx, b.ThreadID, userID, b.ID, status)
	if err != nil {
		return nil, Message{}, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, Message{}, nil, err
	}
	b.Status, b.DecidedAt = status, &now
	m.Booking = b
	return b, m, &Thread{ID: b.ThreadID, ListingID: b.ListingID, TenantID: b.GuestID, OwnerID: b.OwnerID}, nil
}

func insertBookingMessage(q dbtx, threadID, senderID, bookingID, event string) (Message, error) {
	res, err := q.Exec(`INSERT INTO messages(thread_id, sender_id, kind, text, booking_id) VALUES (?, ?, 'booking', ?, ?)`,
		threadID, senderID, event, bookingID)
	if err != nil {
		return Message{}, err
	}
	id, _ := res.LastInsertId()
	return scanMessage(q.QueryRow(`SELECT `+messageCols+` FROM messages WHERE id = ?`, id))
}

func writeBookingErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errListingNotFound), errors.Is(err, errRoomNotFound), errors.Is(err, errBookingNotFound):
		writeErr(w, http.StatusNotFound, err.Error())
	case errors.Is(err, errNotOwner):
		writeErr(w, http.StatusForbidden, err.Error())
	case errors.Is(err, errNotAvailable), errors.Is(err, errBookingState), errors.Is(err, errListingNotActive):
		writeErr(w, http.StatusConflict, err.Error())
	case errors.Is(err, errStayDates), errors.Is(err, errStayGuests), errors.Is(err, errTooManyGuests),
		errors.Is(err, errOwnBooking), errors.Is(err, errNotHotel):
		writeErr(w, http.StatusBadRequest, err.Error())
	default:
		writeErr(w, http.StatusInternalServerError, "db error")
	}
}

func handleCreateBooking(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	var in bookingInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	b, m, t, err := createBooking(u.ID, r.PathValue("id"), in, time.Now())
	if err != nil {
		writeBookingErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"booking": b, "threadId": t.ID})
	publishChatMessage(m, t)
}

type bookingDecisionInput struct {
	Status string `json:"status"`
}

func handleDecideBooking(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	var in bookingDecisionInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if in.Status != "confirmed" && in.Status != "declined" {
		writeErr(w, http.StatusBadRequest, "invalid status")
		return
	}
	b, m, t, err := changeBooking(u.ID, r.PathValue("id"), in.Status, time.Now())
	if err != nil {
		writeBookingErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
	publishChatMessage(m, t)
}

func handleCancelBooking(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	b, m, t, err := changeBooking(u.ID, r.PathValue("id"), "cancelled", time.Now())
	if err != nil {
		writeBookingErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, b)
	publishChatMessage(m, t)
}

func handleListBookings(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	rows, err := db.Query(`SELECT `+bookingCols+bookingFrom+` WHERE b.guest_id = ? OR b.owner_id = ? ORDER BY b.created_at DESC`, u.ID, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	defer rows.Close()
	out := []*Booking{}
	for rows.Next() {
		b, err := scanBooking(rows)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		out = append(out, b)
	}
	writeJSON(w, http.StatusOK, out)
}
