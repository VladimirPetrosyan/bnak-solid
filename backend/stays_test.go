package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func day(now time.Time, offset int) string {
	return now.AddDate(0, 0, offset).Format(dayLayout)
}

func mustCreateHotel(t *testing.T, ownerID string) string {
	t.Helper()
	id := newID()
	if _, err := db.Exec(`INSERT INTO listings(id, owner_id, deal, city, street, status, expires_at, title, stay_kind)
		VALUES (?, ?, 'hotel', 'yerevan', 'Abovyan 1', 'active', ?, 'Test Hotel', 'hotel')`,
		id, ownerID, time.Now().Add(confirmWindow)); err != nil {
		t.Fatalf("create hotel: %v", err)
	}
	return id
}

func mustCreateRoom(t *testing.T, listingID string, capacity, quantity, price int) RoomType {
	t.Helper()
	id := newID()
	if _, err := db.Exec(`INSERT INTO room_types(id, listing_id, name, capacity, quantity, price) VALUES (?, ?, 'Double', ?, ?, ?)`,
		id, listingID, capacity, quantity, price); err != nil {
		t.Fatalf("create room: %v", err)
	}
	if err := syncHotelPrice(db, listingID); err != nil {
		t.Fatalf("sync price: %v", err)
	}
	room, err := loadRoomType(db, listingID, id)
	if err != nil {
		t.Fatalf("load room: %v", err)
	}
	return room
}

func TestStayNights(t *testing.T) {
	now := time.Now()
	days, err := stayNights(day(now, 1), day(now, 4), now)
	if err != nil || len(days) != 3 || days[0] != day(now, 1) || days[2] != day(now, 3) {
		t.Fatalf("days = %v, err = %v", days, err)
	}
	if _, err := stayNights(day(now, 0), day(now, 1), now); err != nil {
		t.Fatalf("check-in today must be allowed: %v", err)
	}
	for _, c := range [][2]string{
		{day(now, -1), day(now, 1)},
		{day(now, 2), day(now, 2)},
		{day(now, 3), day(now, 1)},
		{day(now, 1), day(now, 1+maxStayNights+1)},
		{"2026-13-01", day(now, 2)},
	} {
		if _, err := stayNights(c[0], c[1], now); !errors.Is(err, errStayDates) {
			t.Fatalf("%v: want errStayDates, got %v", c, err)
		}
	}
}

func TestRoomAvailability(t *testing.T) {
	setupTestDB(t)
	now := time.Now()
	owner := mustCreateUser(t, "hotel")
	guest := mustCreateUser(t, "tenant")
	hotel := mustCreateHotel(t, owner)
	room := mustCreateRoom(t, hotel, 2, 2, 15000)
	days, _ := stayNights(day(now, 1), day(now, 3), now)

	if n, _ := roomAvailable(db, room, days); n != 2 {
		t.Fatalf("available = %d, want 2", n)
	}

	b, _, _, err := createBooking(guest, hotel, bookingInput{RoomTypeID: room.ID, CheckIn: day(now, 2), CheckOut: day(now, 4), Guests: 2}, now)
	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if n, _ := roomAvailable(db, room, days); n != 2 {
		t.Fatalf("pending booking must not take a room, available = %d", n)
	}
	if _, _, _, err := changeBooking(owner, b.ID, "confirmed", now); err != nil {
		t.Fatalf("confirm: %v", err)
	}
	if n, _ := roomAvailable(db, room, days); n != 1 {
		t.Fatalf("confirmed booking must take a room, available = %d", n)
	}
	early, _ := stayNights(day(now, 1), day(now, 2), now)
	if n, _ := roomAvailable(db, room, early); n != 2 {
		t.Fatalf("night before check-in must stay free, available = %d", n)
	}

	if err := setRoomClosures(room.ID, closuresInput{Days: []string{day(now, 1)}, Closed: true}); err != nil {
		t.Fatalf("close day: %v", err)
	}
	if n, _ := roomAvailable(db, room, days); n != 0 {
		t.Fatalf("closed day must make the room unavailable, available = %d", n)
	}
	if err := setRoomClosures(room.ID, closuresInput{Days: []string{day(now, 1)}, Closed: false}); err != nil {
		t.Fatalf("open day: %v", err)
	}
	if n, _ := roomAvailable(db, room, days); n != 1 {
		t.Fatalf("reopened day, available = %d, want 1", n)
	}
}

func TestCreateBookingRules(t *testing.T) {
	setupTestDB(t)
	now := time.Now()
	owner := mustCreateUser(t, "hotel")
	guest := mustCreateUser(t, "tenant")
	hotel := mustCreateHotel(t, owner)
	room := mustCreateRoom(t, hotel, 2, 1, 20000)
	in := bookingInput{RoomTypeID: room.ID, CheckIn: day(now, 1), CheckOut: day(now, 4), Guests: 2}

	tooMany := in
	tooMany.Guests = 3
	if _, _, _, err := createBooking(guest, hotel, tooMany, now); !errors.Is(err, errTooManyGuests) {
		t.Fatalf("want errTooManyGuests, got %v", err)
	}
	if _, _, _, err := createBooking(owner, hotel, in, now); !errors.Is(err, errOwnBooking) {
		t.Fatalf("want errOwnBooking, got %v", err)
	}

	b, m, thread, err := createBooking(guest, hotel, in, now)
	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if b.Nights != 3 || b.Total != 60000 || b.Status != "pending" || b.ListingTitle != "Test Hotel" {
		t.Fatalf("booking = %+v", b)
	}
	if m.Kind != "booking" || m.Text != "request" || m.BookingID != b.ID || m.Booking == nil {
		t.Fatalf("message = %+v", m)
	}
	var threadOwner string
	db.QueryRow(`SELECT owner_id FROM threads WHERE id = ?`, thread.ID).Scan(&threadOwner)
	if threadOwner != owner {
		t.Fatalf("thread owner = %q, want %q", threadOwner, owner)
	}

	if _, _, _, err := changeBooking(owner, b.ID, "confirmed", now); err != nil {
		t.Fatalf("confirm: %v", err)
	}
	other := mustCreateUser(t, "tenant")
	if _, _, _, err := createBooking(other, hotel, in, now); !errors.Is(err, errNotAvailable) {
		t.Fatalf("want errNotAvailable for a sold-out room, got %v", err)
	}
}

func TestChangeBookingPermissions(t *testing.T) {
	setupTestDB(t)
	now := time.Now()
	owner := mustCreateUser(t, "hotel")
	guest := mustCreateUser(t, "tenant")
	hotel := mustCreateHotel(t, owner)
	room := mustCreateRoom(t, hotel, 2, 1, 20000)
	in := bookingInput{RoomTypeID: room.ID, CheckIn: day(now, 1), CheckOut: day(now, 2), Guests: 1}

	b, _, _, err := createBooking(guest, hotel, in, now)
	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if _, _, _, err := changeBooking(guest, b.ID, "confirmed", now); !errors.Is(err, errNotOwner) {
		t.Fatalf("guest must not confirm, got %v", err)
	}
	if _, _, _, err := changeBooking(owner, b.ID, "cancelled", now); !errors.Is(err, errNotOwner) {
		t.Fatalf("hotel must not cancel for the guest, got %v", err)
	}
	if _, _, _, err := changeBooking(owner, b.ID, "declined", now); err != nil {
		t.Fatalf("decline: %v", err)
	}
	if _, _, _, err := changeBooking(owner, b.ID, "confirmed", now); !errors.Is(err, errBookingState) {
		t.Fatalf("want errBookingState after decline, got %v", err)
	}

	second, _, _, err := createBooking(guest, hotel, in, now)
	if err != nil {
		t.Fatalf("create second booking: %v", err)
	}
	if _, _, _, err := changeBooking(guest, second.ID, "cancelled", now); err != nil {
		t.Fatalf("guest cancel: %v", err)
	}
}

func TestListHotelsByDates(t *testing.T) {
	setupTestDB(t)
	now := time.Now()
	owner := mustCreateUser(t, "hotel")
	open := mustCreateHotel(t, owner)
	mustCreateRoom(t, open, 2, 3, 12000)
	mustCreateRoom(t, open, 4, 1, 30000)
	closed := mustCreateHotel(t, owner)
	closedRoom := mustCreateRoom(t, closed, 2, 1, 9000)
	if err := setRoomClosures(closedRoom.ID, closuresInput{Days: []string{day(now, 2)}, Closed: true}); err != nil {
		t.Fatalf("close: %v", err)
	}
	mustCreateHotel(t, owner)

	req := httptest.NewRequest(http.MethodGet, "/api/listings?deal=hotel&checkIn="+day(now, 1)+"&checkOut="+day(now, 4)+"&guests=2", nil)
	rec := httptest.NewRecorder()
	handleListListings(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out []struct {
		Listing Listing  `json:"listing"`
		Stay    StayInfo `json:"stay"`
	}
	json.Unmarshal(rec.Body.Bytes(), &out)
	if len(out) != 1 || out[0].Listing.ID != open {
		t.Fatalf("want only the hotel with free rooms, got %d entries", len(out))
	}
	if out[0].Stay.Nights != 3 || out[0].Stay.MinNightly != 12000 || out[0].Stay.MinTotal != 36000 {
		t.Fatalf("stay = %+v", out[0].Stay)
	}
	if out[0].Listing.Price != 12000 || out[0].Listing.Rooms != 2 {
		t.Fatalf("synced price/rooms = %d/%d", out[0].Listing.Price, out[0].Listing.Rooms)
	}

	bad := httptest.NewRequest(http.MethodGet, "/api/listings?deal=hotel&checkIn="+day(now, 3)+"&checkOut="+day(now, 1), nil)
	badRec := httptest.NewRecorder()
	handleListListings(badRec, bad)
	if badRec.Code != http.StatusBadRequest {
		t.Fatalf("invalid dates: status = %d", badRec.Code)
	}
}

func TestValidateHotelInput(t *testing.T) {
	ok := listingInput{Deal: "hotel", City: "yerevan", Street: "Abovyan 1", Title: "Hotel", StayKind: "hostel", CheckIn: "14:00", CheckOut: "12:00"}
	if err := validateListingInput(ok); err != nil {
		t.Fatalf("hotel without price/area/cadastre must be valid: %v", err)
	}
	noTitle := ok
	noTitle.Title = ""
	if err := validateListingInput(noTitle); !errors.Is(err, errHotelInvalid) {
		t.Fatalf("want errHotelInvalid, got %v", err)
	}
	badKind := ok
	badKind.StayKind = "castle"
	if err := validateListingInput(badKind); !errors.Is(err, errStayKind) {
		t.Fatalf("want errStayKind, got %v", err)
	}
	badTime := ok
	badTime.CheckIn = "25:00"
	if err := validateListingInput(badTime); !errors.Is(err, errStayTime) {
		t.Fatalf("want errStayTime, got %v", err)
	}
}

func TestValidateRoomInput(t *testing.T) {
	in, err := validateRoomInput(roomInput{Name: "  Двухместный  стандарт ", Capacity: 2, Quantity: 5, Price: 15000})
	if err != nil || in.Name != "Двухместный стандарт" || in.Bathroom != "private" {
		t.Fatalf("in = %+v, err = %v", in, err)
	}
	for _, bad := range []roomInput{
		{Name: "", Capacity: 2, Quantity: 1, Price: 1},
		{Name: "A", Capacity: 0, Quantity: 1, Price: 1},
		{Name: "A", Capacity: 2, Quantity: 0, Price: 1},
		{Name: "A", Capacity: 2, Quantity: 1, Price: 0},
		{Name: "A", Capacity: 2, Quantity: 1, Price: 1, Bathroom: "outside"},
	} {
		if _, err := validateRoomInput(bad); !errors.Is(err, errRoomInvalid) {
			t.Fatalf("%+v: want errRoomInvalid, got %v", bad, err)
		}
	}
}
