package main

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"reflect"
	"strconv"
	"strings"
	"time"
)

const confirmWindow = 72 * time.Hour

// ---------- сериализация ----------

func scanListing(row interface {
	Scan(dest ...any) error
}) (*Listing, error) {
	var l Listing
	var featuresJSON string
	var promotedUntil sql.NullTime
	err := row.Scan(&l.ID, &l.OwnerID, &l.Deal, &l.City, &l.District, &l.Street, &l.Lat, &l.Lng,
		&l.Price, &l.Rooms, &l.Area, &l.Floor, &l.FloorsTotal, &featuresJSON, &l.Description, &l.Deposit,
		&l.CadastreCode, &l.RepairCondition, &l.Status, &l.ConfirmedAt, &l.ExpiresAt, &l.CreatedAt, &l.UpdatedAt, &promotedUntil,
		&l.Title, &l.StayKind, &l.CheckIn, &l.CheckOut)
	if err != nil {
		return nil, err
	}
	json.Unmarshal([]byte(featuresJSON), &l.Features)
	if l.Features == nil {
		l.Features = []string{}
	}
	if promotedUntil.Valid {
		t := promotedUntil.Time
		l.PromotedUntil = &t
		l.Promoted = t.After(time.Now())
	}
	return &l, nil
}

const listingCols = `id, owner_id, deal, city, district, street, lat, lng, price, rooms, area,
	floor, floors_total, features, description, deposit, cadastre_code, repair_condition, status, confirmed_at, expires_at, created_at, updated_at, promoted_until,
	title, stay_kind, check_in, check_out`

// listingColsQ — та же выборка, но с префиксом l. для запросов с JOIN, где иначе
// created_at (он есть и в listings, и, например, в favorites/reports) неоднозначен.
const listingColsQ = `l.id, l.owner_id, l.deal, l.city, l.district, l.street, l.lat, l.lng, l.price, l.rooms, l.area,
	l.floor, l.floors_total, l.features, l.description, l.deposit, l.cadastre_code, l.repair_condition, l.status, l.confirmed_at, l.expires_at, l.created_at, l.updated_at, l.promoted_until,
	l.title, l.stay_kind, l.check_in, l.check_out`

func loadPhotos(listingID string) []string {
	rows, err := db.Query(`SELECT url FROM listing_photos WHERE listing_id = ? ORDER BY position, id`, listingID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var u string
		if rows.Scan(&u) == nil {
			out = append(out, u)
		}
	}
	return out
}

func loadVideos(listingID string) []string {
	rows, err := db.Query(`SELECT url FROM listing_videos WHERE listing_id = ? ORDER BY position, id`, listingID)
	if err != nil {
		return []string{}
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var u string
		if rows.Scan(&u) == nil {
			out = append(out, u)
		}
	}
	return out
}

func attachOwnerAndPhotos(l *Listing) map[string]any {
	l.Photos = loadPhotos(l.ID)
	l.Videos = loadVideos(l.ID)
	var owner User
	db.QueryRow(`SELECT id, phone, name, role, ini, created_at FROM users WHERE id = ?`, l.OwnerID).
		Scan(&owner.ID, &owner.Phone, &owner.Name, &owner.Role, &owner.Ini, &owner.CreatedAt)
	return map[string]any{
		"listing": l,
		"owner":   owner,
	}
}

func withPendingRevision(out map[string]any, listingID, requesterID, ownerID string) (map[string]any, error) {
	if requesterID == "" || requesterID != ownerID {
		return out, nil
	}
	rev, err := loadPendingRevision(listingID)
	if err != nil {
		return nil, err
	}
	out["pendingRevision"] = rev
	return out, nil
}

// loadOwnerSummary — облегчённая версия для карточек в списках (без телефона).
func loadOwnerSummary(ownerID string) map[string]any {
	var o User
	db.QueryRow(`SELECT id, name, role, ini FROM users WHERE id = ?`, ownerID).
		Scan(&o.ID, &o.Name, &o.Role, &o.Ini)
	return map[string]any{"id": o.ID, "name": o.Name, "role": o.Role, "ini": o.Ini}
}

// ---------- GET /api/listings ----------

func handleListListings(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	where := []string{"status = 'active'"}
	args := []any{}

	if deal := q.Get("deal"); deal != "" {
		where = append(where, "deal = ?")
		args = append(args, deal)
	}
	if city := q.Get("city"); city != "" {
		where = append(where, "city = ?")
		args = append(args, city)
	}
	if rooms := q.Get("rooms"); rooms != "" && rooms != "all" {
		if rooms == "studio" {
			where = append(where, "rooms = 0")
		} else if n, err := strconv.Atoi(rooms); err == nil {
			if n >= 3 {
				where = append(where, "rooms >= ?")
			} else {
				where = append(where, "rooms = ?")
			}
			args = append(args, n)
		}
	}
	if v := q.Get("priceMin"); v != "" {
		where = append(where, "price >= ?")
		args = append(args, v)
	}
	if v := q.Get("priceMax"); v != "" {
		where = append(where, "price <= ?")
		args = append(args, v)
	}
	if v := q.Get("areaMin"); v != "" {
		where = append(where, "area >= ?")
		args = append(args, v)
	}
	if v := q.Get("areaMax"); v != "" {
		where = append(where, "area <= ?")
		args = append(args, v)
	}
	if v := strings.TrimSpace(q.Get("query")); v != "" {
		where = append(where, "(street LIKE ? OR description LIKE ?)")
		like := "%" + v + "%"
		args = append(args, like, like)
	}

	sql := `SELECT ` + listingCols + ` FROM listings WHERE ` + strings.Join(where, " AND ") +
		` ORDER BY (promoted_until IS NOT NULL AND promoted_until > ?) DESC, confirmed_at DESC LIMIT 500`
	args = append(args, time.Now().UTC())
	rows, err := db.Query(sql, args...)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	list, err := drainListings(rows)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	if lang := requestLang(r); lang != "" {
		descs := make([]string, len(list))
		for i, l := range list {
			descs[i] = l.Description
		}
		translated := translateBatch(descs, lang)
		for i, l := range list {
			l.Description = translated[i]
		}
	}

	stay, err := parseStayQuery(q, time.Now())
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	out := []map[string]any{}
	for _, l := range list {
		entry := map[string]any{"listing": l, "owner": loadOwnerSummary(l.OwnerID)}
		if l.Deal == "hotel" {
			info, err := stayInfoFor(db, l.ID, stay)
			if err != nil {
				writeErr(w, http.StatusInternalServerError, "db error")
				return
			}
			if !info.Bookable {
				continue
			}
			entry["stay"] = info
		}
		l.Photos = loadPhotos(l.ID)
		l.Videos = loadVideos(l.ID)
		out = append(out, entry)
	}
	writeJSON(w, http.StatusOK, out)
}

// drainListings полностью вычитывает результат запроса и закрывает rows,
// прежде чем вызывающий код начнёт делать по каждой строке вложенные запросы
// (фото, автор) — иначе с ограниченным пулом соединений вложенный запрос
// будет ждать освобождения того самого соединения, которое держит открытый rows.
func drainListings(rows *sql.Rows) ([]*Listing, error) {
	defer rows.Close()
	out := []*Listing{}
	for rows.Next() {
		l, err := scanListing(rows)
		if err != nil {
			continue
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// ---------- GET /api/listings/{id} ----------

func handleGetListing(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	row := db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, id)
	l, err := scanListing(row)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	if lang := requestLang(r); lang != "" {
		l.Description = translateCached(l.Description, lang)
	}
	out := attachOwnerAndPhotos(l)
	requesterID := ""
	if u := userFromCtx(r.Context()); u != nil {
		requesterID = u.ID
	}
	inserted, err := recordListingViewResult(l.ID, l.OwnerID, requesterID, r.Header.Get(browserIDHeader))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	views, err := viewCount(l.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	favorites, err := favoriteCount(l.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	out["views"] = views
	out["favorites"] = favorites
	if l.Deal == "hotel" {
		stay, err := parseStayQuery(r.URL.Query(), time.Now())
		if err != nil {
			stay = stayQuery{}
		}
		info, err := stayInfoFor(db, l.ID, stay)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		out["stay"] = info
	}
	out, err = withPendingRevision(out, l.ID, requesterID, l.OwnerID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, out)
	if inserted {
		publishListingViews(l.ID, l.OwnerID, views)
	}
}

// ---------- GET /api/listings/mine ----------

func handleMyListings(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	rows, err := db.Query(`SELECT `+listingCols+` FROM listings WHERE owner_id = ? ORDER BY created_at DESC`, u.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	list, err := drainListings(rows)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	ids := make([]string, len(list))
	for i, l := range list {
		ids[i] = l.ID
	}
	views, err := viewCounts(ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	favorites, err := favoriteCounts(ids)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	out := []map[string]any{}
	for _, l := range list {
		l.Photos = loadPhotos(l.ID)
		l.Videos = loadVideos(l.ID)
		entry := map[string]any{"listing": l, "owner": loadOwnerSummary(l.OwnerID), "views": views[l.ID], "favorites": favorites[l.ID]}
		if l.Deal == "hotel" {
			info, err := stayInfoFor(db, l.ID, stayQuery{})
			if err != nil {
				writeErr(w, http.StatusInternalServerError, "db error")
				return
			}
			entry["stay"] = info
		}
		if l.Status == "rented" {
			outcome, err := loadListingOutcome(l.ID)
			if err != nil {
				writeErr(w, http.StatusInternalServerError, "db error")
				return
			}
			if outcome != nil {
				entry["outcome"] = outcome
			}
		}
		entry, err := withPendingRevision(entry, l.ID, u.ID, l.OwnerID)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, "db error")
			return
		}
		out = append(out, entry)
	}
	writeJSON(w, http.StatusOK, out)
}

// ---------- POST /api/listings ----------

type listingInput struct {
	Deal            string   `json:"deal"`
	City            string   `json:"city"`
	District        string   `json:"d"`
	Street          string   `json:"street"`
	Lat             float64  `json:"lat"`
	Lng             float64  `json:"lng"`
	Price           int      `json:"price"`
	Rooms           int      `json:"rooms"`
	Area            int      `json:"area"`
	Floor           int      `json:"fl"`
	FloorsTotal     int      `json:"fls"`
	Features        []string `json:"f"`
	Description     string   `json:"desc"`
	Deposit         string   `json:"dep"`
	CadastreCode    string   `json:"cadastreCode"`
	RepairCondition string   `json:"repairCondition"`
	Title           string   `json:"title"`
	StayKind        string   `json:"stayKind"`
	CheckIn         string   `json:"checkIn"`
	CheckOut        string   `json:"checkOut"`
}

// ---------- POST /api/listings ----------

func handleCreateListing(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())

	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBytes)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			writeErr(w, http.StatusRequestEntityTooLarge, "request too large")
		} else {
			writeErr(w, http.StatusBadRequest, "bad multipart form")
		}
		return
	}
	defer r.MultipartForm.RemoveAll()

	listingField := r.FormValue("listing")
	if strings.TrimSpace(listingField) == "" {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	var in listingInput
	dec := json.NewDecoder(strings.NewReader(listingField))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if in.Deal == "hotel" {
		in.Title = normalizeSpaces(in.Title)
		in.Price, in.Rooms, in.Area = 0, 0, 0
	} else {
		in.Title, in.StayKind, in.CheckIn, in.CheckOut = "", "", "", ""
	}
	if err := validateListingInput(in); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if lat, lng, ok := geocodeAddress(in.City, in.District, in.Street); ok {
		in.Lat, in.Lng = lat, lng
	}

	doc, err := saveDocument(r, "document")
	if err != nil {
		writeDocumentErr(w, err)
		return
	}

	id := newID()
	now := time.Now()
	featuresJSON, _ := json.Marshal(in.Features)
	if err := createListingWithDocument(id, u.ID, in, featuresJSON, doc, now); err != nil {
		os.Remove(doc.path)
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}

	// автору выдаём роль владельца (или отеля), если раньше был просто арендатором — как в демо
	if u.Role == "tenant" {
		role := "owner"
		if in.Deal == "hotel" {
			role = "hotel"
		}
		db.Exec(`UPDATE users SET role = ? WHERE id = ?`, role, u.ID)
	}
	row := db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, id)
	l, _ := scanListing(row)
	writeJSON(w, http.StatusCreated, map[string]any{"listing": l, "owner": loadOwnerSummary(u.ID)})
}

func createListingWithDocument(id, ownerID string, in listingInput, featuresJSON []byte, doc *uploadedDocument, now time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`INSERT INTO listings
		(id, owner_id, deal, city, district, street, lat, lng, price, rooms, area, floor, floors_total,
		 features, description, deposit, cadastre_code, repair_condition, status, confirmed_at, expires_at, created_at, updated_at,
		 title, stay_kind, check_in, check_out)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, ownerID, in.Deal, in.City, in.District, in.Street, in.Lat, in.Lng, in.Price, in.Rooms, in.Area,
		in.Floor, in.FloorsTotal, string(featuresJSON), in.Description, in.Deposit, in.CadastreCode, in.RepairCondition, now, now.Add(confirmWindow), now, now,
		in.Title, in.StayKind, in.CheckIn, in.CheckOut); err != nil {
		return err
	}

	if _, err := tx.Exec(`INSERT INTO listing_documents(id, listing_id, original_name, stored_name, mime_type, size, sha256, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
		newID(), id, doc.originalName, doc.storedName, doc.mimeType, doc.size, doc.sha256); err != nil {
		return err
	}

	return tx.Commit()
}

// ---------- PUT /api/listings/{id} ----------

var (
	errListingInvalid         = errors.New("street, price and area are required")
	errCadastreRequired       = errors.New("cadastre certificate code is required")
	errRepairConditionInvalid = errors.New("invalid_repair_condition")
)

var validRepairConditions = map[string]bool{
	"none": true, "needs": true, "cosmetic": true, "good": true, "designer": true,
}

var (
	errHotelInvalid = errors.New("hotel title and address are required")
	errStayKind     = errors.New("invalid_stay_kind")
	errStayTime     = errors.New("invalid_stay_time")
)

var validStayKinds = map[string]bool{"hotel": true, "hostel": true, "guesthouse": true}

func validStayTime(s string) bool {
	if s == "" {
		return true
	}
	_, err := time.Parse("15:04", s)
	return err == nil
}

func validateListingInput(in listingInput) error {
	if in.Deal == "hotel" {
		if strings.TrimSpace(in.Title) == "" || strings.TrimSpace(in.Street) == "" {
			return errHotelInvalid
		}
		if !validStayKinds[in.StayKind] {
			return errStayKind
		}
		if !validStayTime(in.CheckIn) || !validStayTime(in.CheckOut) {
			return errStayTime
		}
		return nil
	}
	if strings.TrimSpace(in.Street) == "" || in.Price <= 0 || in.Area <= 0 {
		return errListingInvalid
	}
	if strings.TrimSpace(in.CadastreCode) == "" {
		return errCadastreRequired
	}
	if !validRepairConditions[in.RepairCondition] {
		return errRepairConditionInvalid
	}
	return nil
}

func normalizeSpaces(s string) string {
	return strings.Join(strings.Fields(s), " ")
}

func normalizeListingInput(in listingInput) listingInput {
	in.City = normalizeSpaces(in.City)
	in.District = normalizeSpaces(in.District)
	in.Street = normalizeSpaces(in.Street)
	in.Description = normalizeSpaces(in.Description)
	in.Deposit = normalizeSpaces(in.Deposit)
	in.CadastreCode = normalizeSpaces(in.CadastreCode)
	in.Title = normalizeSpaces(in.Title)
	if in.Deal != "hotel" {
		in.Title, in.StayKind, in.CheckIn, in.CheckOut = "", "", "", ""
	}
	if in.Features == nil {
		in.Features = []string{}
	}
	return in
}

func listingInputEqual(l *Listing, in listingInput) bool {
	return l.Deal == in.Deal && l.City == in.City && l.District == in.District && l.Street == in.Street &&
		l.Lat == in.Lat && l.Lng == in.Lng && l.Price == in.Price && l.Rooms == in.Rooms && l.Area == in.Area &&
		l.Floor == in.Floor && l.FloorsTotal == in.FloorsTotal && l.Description == in.Description &&
		l.Deposit == in.Deposit && l.CadastreCode == in.CadastreCode && l.RepairCondition == in.RepairCondition &&
		l.Title == in.Title && l.StayKind == in.StayKind && l.CheckIn == in.CheckIn && l.CheckOut == in.CheckOut &&
		reflect.DeepEqual(l.Features, in.Features)
}

func applyListingUpdate(listingID string, in listingInput, now time.Time) error {
	return updateListingRow(db, listingID, in, now)
}

func updateListingRow(q dbtx, listingID string, in listingInput, now time.Time) error {
	featuresJSON, _ := json.Marshal(in.Features)
	res, err := q.Exec(`UPDATE listings SET deal=?, city=?, district=?, street=?, lat=?, lng=?, price=?, rooms=?,
		area=?, floor=?, floors_total=?, features=?, description=?, deposit=?, cadastre_code=?, repair_condition=?,
		title=?, stay_kind=?, check_in=?, check_out=?, updated_at=? WHERE id=?`,
		in.Deal, in.City, in.District, in.Street, in.Lat, in.Lng, in.Price, in.Rooms, in.Area,
		in.Floor, in.FloorsTotal, string(featuresJSON), in.Description, in.Deposit, in.CadastreCode, in.RepairCondition,
		in.Title, in.StayKind, in.CheckIn, in.CheckOut, now, listingID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n != 1 {
		return errListingNotFound
	}
	if in.Deal == "hotel" {
		return syncHotelPrice(q, listingID)
	}
	return nil
}

func handleUpdateListing(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	var in listingInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	in = normalizeListingInput(in)
	if in.Deal == "hotel" {
		in.Price, in.Rooms, in.Area = l.Price, l.Rooms, 0
	}
	if err := validateListingInput(in); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if lat, lng, ok := geocodeAddress(in.City, in.District, in.Street); ok {
		in.Lat, in.Lng = lat, lng
	}
	if (l.Deal == "hotel") != (in.Deal == "hotel") {
		writeErr(w, http.StatusBadRequest, "deal_change_not_allowed")
		return
	}
	if listingInputEqual(l, in) {
		writeErr(w, http.StatusBadRequest, "no_changes")
		return
	}

	now := time.Now()
	if l.Status == "pending" {
		switch err := applyListingUpdate(l.ID, in, now); {
		case errors.Is(err, errListingNotFound):
			writeErr(w, http.StatusNotFound, "not found")
		case err != nil:
			writeErr(w, http.StatusInternalServerError, "db error")
		default:
			writeJSON(w, http.StatusOK, map[string]string{"reviewStatus": "listing_pending"})
		}
		return
	}

	rev, err := createListingRevision(l.ID, l.OwnerID, in, now)
	switch {
	case errors.Is(err, errRevisionPending):
		writeErr(w, http.StatusConflict, "revision_pending")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusAccepted, map[string]any{"reviewStatus": "pending", "revision": rev})
	}
}

// ---------- DELETE /api/listings/{id} ----------

func handleDeleteListing(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	if err := deleteListingAndDocument(l.ID); err != nil {
		if errors.Is(err, errListingNotFound) {
			writeErr(w, http.StatusNotFound, "not found")
			return
		}
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

// ---------- POST /api/listings/{id}/confirm ----------
// Подтверждение «раз в 72 часа». В демо это делалось SMS-кодом на тот же номер;
// здесь пользователь уже аутентифицирован тем же номером, так что вход = подтверждение.

func handleConfirmListing(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	now := time.Now()
	res, err := db.Exec(`UPDATE listings SET status='active', confirmed_at=?, expires_at=?, updated_at=? WHERE id=?`,
		now, now.Add(confirmWindow), now, l.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	if n, _ := res.RowsAffected(); n == 1 {
		publishListingState(l.ID)
	}
}

// ---------- POST /api/listings/{id}/mark-taken ----------

var allowedOutcomeSources = map[string]bool{
	"bnak":           true,
	"other_platform": true,
	"referral":       true,
	"offline":        true,
	"other":          true,
}

type markTakenInput struct {
	Source string `json:"source"`
}

func handleMarkTaken(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	var in markTakenInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	if !allowedOutcomeSources[in.Source] {
		writeErr(w, http.StatusBadRequest, "invalid_source")
		return
	}
	outcome, err := markListingTaken(u.ID, id, in.Source, time.Now())
	switch {
	case errors.Is(err, errListingNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case errors.Is(err, errNotOwner):
		writeErr(w, http.StatusForbidden, "not your listing")
	case errors.Is(err, errListingNotActive):
		writeErr(w, http.StatusConflict, "listing_not_active")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "outcome": outcome})
	}
}

func markListingTaken(userID, listingID, source string, now time.Time) (*ListingOutcome, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	l, err := scanListing(tx.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, listingID))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errListingNotFound
	}
	if err != nil {
		return nil, err
	}
	if l.OwnerID != userID {
		return nil, errNotOwner
	}

	res, err := tx.Exec(`UPDATE listings SET status='rented', updated_at=? WHERE id=? AND status='active'`, now, listingID)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n != 1 {
		return nil, errListingNotActive
	}

	secondsToClose := int(now.Sub(l.CreatedAt).Seconds())
	if secondsToClose < 0 {
		secondsToClose = 0
	}
	if _, err := tx.Exec(`INSERT INTO listing_outcomes(listing_id, owner_id, source, closed_at, seconds_to_close) VALUES (?, ?, ?, ?, ?)`,
		listingID, userID, source, now, secondsToClose); err != nil {
		return nil, err
	}
	if _, err := grantTokens(tx, now, grantInput{
		userID: userID, amount: rewardMarkTaken, kind: kindMarkTaken, eventKey: "mark_taken:" + listingID, listingID: &listingID,
	}); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	publishListingState(listingID)
	return &ListingOutcome{Source: source, ClosedAt: now, SecondsToClose: secondsToClose}, nil
}

func loadListingOutcome(listingID string) (*ListingOutcome, error) {
	var o ListingOutcome
	err := db.QueryRow(`SELECT source, closed_at, seconds_to_close FROM listing_outcomes WHERE listing_id = ?`, listingID).
		Scan(&o.Source, &o.ClosedAt, &o.SecondsToClose)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

// ---------- POST /api/listings/{id}/return-to-feed ----------

func handleReturnToFeed(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	now := time.Now()
	res, err := db.Exec(`UPDATE listings SET status='active', confirmed_at=?, expires_at=?, updated_at=? WHERE id=?`,
		now, now.Add(confirmWindow), now, l.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	if n, _ := res.RowsAffected(); n == 1 {
		publishListingState(l.ID)
	}
}

// ---------- POST /api/listings/{id}/report ----------

type reportInput struct {
	Reason string `json:"reason"`
	Text   string `json:"text"`
}

func handleReportListing(w http.ResponseWriter, r *http.Request) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	var in reportInput
	if err := readJSON(r, &in); err != nil {
		writeErr(w, http.StatusBadRequest, "bad json")
		return
	}
	changed, err := createListingReport(id, u.ID, in, time.Now())
	switch {
	case errors.Is(err, errListingNotFound):
		writeErr(w, http.StatusNotFound, "not found")
	case err != nil:
		writeErr(w, http.StatusInternalServerError, "db error")
	default:
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
		if changed {
			publishListingState(id)
		}
	}
}

func createListingReport(listingID, reporterID string, in reportInput, now time.Time) (bool, error) {
	tx, err := db.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var exists string
	err = tx.QueryRow(`SELECT id FROM listings WHERE id = ?`, listingID).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return false, errListingNotFound
	}
	if err != nil {
		return false, err
	}

	if _, err := tx.Exec(`INSERT INTO reports(listing_id, reporter_id, reason, text) VALUES (?, ?, ?, ?)`,
		listingID, reporterID, in.Reason, in.Text); err != nil {
		return false, err
	}

	res, err := tx.Exec(`UPDATE listings SET status='flagged', updated_at=? WHERE id=? AND status='active'`, now, listingID)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}
	return n == 1, nil
}

// ---------- POST /api/listings/{id}/resolve ----------
// Владелец отвечает на жалобу и возвращает объявление в выдачу.

func handleResolveReport(w http.ResponseWriter, r *http.Request) {
	l, ok := ownedListingOr403(w, r)
	if !ok {
		return
	}
	changed, err := dismissListingReports(l.ID, time.Now())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	if changed {
		publishListingState(l.ID)
	}
}

func dismissListingReports(listingID string, now time.Time) (bool, error) {
	tx, err := db.Begin()
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	var status string
	err = tx.QueryRow(`SELECT status FROM listings WHERE id = ?`, listingID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if status != "flagged" {
		return false, tx.Commit()
	}

	if _, err := tx.Exec(`UPDATE reports SET status='dismissed' WHERE listing_id = ? AND status='pending'`, listingID); err != nil {
		return false, err
	}
	res, err := tx.Exec(`UPDATE listings SET status='active', confirmed_at=?, expires_at=?, updated_at=? WHERE id=? AND status='flagged'`,
		now, now.Add(confirmWindow), now, listingID)
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}

	if err := tx.Commit(); err != nil {
		return false, err
	}
	return n == 1, nil
}

// ---------- вспомогательное ----------

func ownedListingOr403(w http.ResponseWriter, r *http.Request) (*Listing, bool) {
	u := userFromCtx(r.Context())
	id := r.PathValue("id")
	row := db.QueryRow(`SELECT `+listingCols+` FROM listings WHERE id = ?`, id)
	l, err := scanListing(row)
	if errors.Is(err, sql.ErrNoRows) {
		writeErr(w, http.StatusNotFound, "not found")
		return nil, false
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "db error")
		return nil, false
	}
	if l.OwnerID != u.ID {
		writeErr(w, http.StatusForbidden, "not your listing")
		return nil, false
	}
	return l, true
}

// sweepExpiredListings — фоновая задача: реально скрывает объявления, для которых
// истекло окно подтверждения. В демо это происходило только «на глаз» в браузере,
// пока была открыта вкладка; здесь это настоящая, серверная авто-архивация.
func sweepExpiredListings() {
	now := time.Now()
	rows, err := db.Query(`UPDATE listings SET status='archived', updated_at=? WHERE status='active' AND expires_at < ? RETURNING id`, now, now)
	if err != nil {
		return
	}
	var ids []string
	for rows.Next() {
		var id string
		if rows.Scan(&id) == nil {
			ids = append(ids, id)
		}
	}
	scanErr := rows.Err()
	if closeErr := rows.Close(); closeErr != nil && scanErr == nil {
		scanErr = closeErr
	}
	if scanErr != nil {
		return
	}
	if len(ids) == 0 {
		return
	}
	logf("auto-archived %d listing(s) past their 72h confirmation window", len(ids))
	for _, id := range ids {
		publishListingState(id)
	}
}
