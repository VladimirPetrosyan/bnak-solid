package main

import (
	"encoding/json"
	"log"
	"time"
)

// seedIfEmpty кладёт несколько демонстрационных объявлений при первом запуске на пустой
// базе — чтобы GET /api/listings сразу что-то вернул, а не пустой список. Вызывается
// только при DEV_MODE=1 (см. main.go) — в проде на свежей базе список должен быть пустым.
// Можно спокойно удалить содержимое bnak.db и перезапустить, если демо-данные не нужны.
func seedIfEmpty() {
	var n int
	db.QueryRow(`SELECT COUNT(*) FROM listings`).Scan(&n)
	if n > 0 {
		return
	}

	owner, _, err := findOrCreateUser("37455214806", "Ани Акопян", "owner")
	if err != nil {
		log.Println("seed owner:", err)
		return
	}
	agency, _, err := findOrCreateUser("37410544120", "Yerevan Home", "agency")
	if err != nil {
		log.Println("seed agency:", err)
		return
	}

	type seedListing struct {
		ownerID            string
		deal, city, d, st  string
		lat, lng           float64
		price, rooms, area int
		fl, fls            int
		f                  []string
		desc               string
	}
	rows := []seedListing{
		{owner.ID, "rent", "yerevan", "kentron", "Абовяна 41", 40.1855, 44.5165, 420000, 2, 58, 5, 9,
			[]string{"furn", "ac", "elev"}, "Светлая квартира в центре, окна во двор, рядом метро."},
		{agency.ID, "rent", "yerevan", "arabkir", "Комитаса просп. 12", 40.2065, 44.4985, 285000, 1, 42, 3, 5,
			[]string{"balcony", "kids"}, "Уютная студия рядом с парком, свежий ремонт."},
		{owner.ID, "sale", "yerevan", "kentron", "Маштоца просп. 33", 40.1830, 44.5090, 78000000, 3, 92, 4, 9,
			[]string{"elev", "parking"}, "Просторная квартира с паркингом в самом центре."},
		{agency.ID, "daily", "yerevan", "kentron", "Туманяна 8", 40.1808, 44.5145, 22000, 1, 40, 3, 6,
			[]string{"furn", "ac", "wifi"}, "Посуточно, всё для комфортного проживания."},
	}

	now := time.Now()
	for _, s := range rows {
		id := newID()
		featuresJSON, _ := json.Marshal(s.f)
		_, err := db.Exec(`INSERT INTO listings
			(id, owner_id, deal, city, district, street, lat, lng, price, rooms, area, floor, floors_total,
			 features, description, deposit, status, confirmed_at, expires_at, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '1 месяц', 'active', ?, ?, ?, ?)`,
			id, s.ownerID, s.deal, s.city, s.d, s.st, s.lat, s.lng, s.price, s.rooms, s.area, s.fl, s.fls,
			string(featuresJSON), s.desc, now, now.Add(confirmWindow), now, now)
		if err != nil {
			log.Println("seed listing:", err)
		}
	}
	log.Printf("seeded %d demo listing(s) for %s / %s", len(rows), owner.Name, agency.Name)
}
