// HayHome backend — минимальный, но настоящий сервер под фронтенд из ../src.
//
// Закрывает то, что во фронтенд-демо было симуляцией в localStorage:
//   - регистрация по номеру телефона: SMS-код подтверждает номер один раз, дальше пароль
//     не короче 8 символов; вход — телефон + пароль, без SMS. Код отправляется через
//     Notificore (см. notificore.go, auth.go handleRequestCode) — пока NOTIFICORE_API_KEY
//     не задан, код печатается в лог и возвращается в devCode;
//   - объявления реально хранятся на сервере и видны всем, а не только автору;
//   - окно подтверждения «раз в 72 часа» реально считается на сервере и реально скрывает
//     объявление, если владелец не подтвердил (sweepExpiredListings, тикает раз в минуту);
//   - загрузка фото — по-настоящему на диск (или потом — в S3/R2, см. photos.go);
//   - избранное и переписка — общие для всех пользователей, а не только для одного браузера.
//
// Не сделано намеренно (нужны решения/ключи, которые может завести только владелец продукта):
//   - приём платежей (баланс/кошелёк убраны совсем — см. git-историю, если понадобится вернуть);
//   - проверка документов собственности человеком/KYC-сервисом. Частичная защита от подделки
//     объявлений уже есть: при публикации требуется защитный код кадастрового сертификата
//     (cadastre_code), который можно вручную сверить на сайте кадастрового комитета — см.
//     README.md, раздел «Проверка по кадастру».
//
// Панель администратора (/api/admin/*, фронтенд — отдельная страница control.html) не связана
// с обычными пользователями вообще: свой логин/пароль, свои сессии, см. admin_auth.go.
//
// Запуск: см. README.md рядом с этим файлом.
package main

import (
	"log"
	"mime"
	"net/http"
	"os"
	"time"
)

func init() {
	mime.AddExtensionType(".weba", "audio/webm")
	mime.AddExtensionType(".oga", "audio/ogg")
	mime.AddExtensionType(".m4a", "audio/mp4")
}

var (
	devMode             bool
	uploadsDir          string
	privateDocumentsDir string
	corsOrigin          string
	publicBaseURL       string
	operatorEmail       string
	operatorCity        string
	notificoreAPIKey    string
	notificoreSender    string
	yandexTranslateKey  string
	yandexFolderID      string
	yandexSpeechKey     string
	yandexGeocoderKey   string
)

func main() {
	uploadsDir = envOr("UPLOADS_DIR", "./uploads")
	privateDocumentsDir = envOr("PRIVATE_DOCUMENTS_DIR", "./private-documents")
	dbPath := envOr("DB_PATH", "./bnak.db")
	port := envOr("PORT", "8080")

	var err error
	if devMode, err = parseDevMode(os.Getenv("DEV_MODE")); err != nil {
		log.Fatal(err)
	}
	if corsOrigin, err = validateOrigins(devMode, os.Getenv("CORS_ORIGIN")); err != nil {
		log.Fatal(err)
	}
	if publicBaseURL, err = validatePublicBaseURL(devMode, os.Getenv("PUBLIC_BASE_URL"), port); err != nil {
		log.Fatal(err)
	}
	if operatorEmail, err = validateOperatorEmail(devMode, os.Getenv("OPERATOR_EMAIL")); err != nil {
		log.Fatal(err)
	}
	if operatorCity, err = validateOperatorCity(devMode, os.Getenv("OPERATOR_CITY")); err != nil {
		log.Fatal(err)
	}
	notificoreAPIKey = os.Getenv("NOTIFICORE_API_KEY")
	notificoreSender = envOr("NOTIFICORE_SENDER", "HayHome")
	// Yandex Translate — перевод пользовательского текста (описания объявлений, сообщения
	// в чате) под язык интерфейса, см. translate.go. Необязательные: без ключа/folderId
	// перевод молча не работает и текст отдаётся как есть.
	yandexTranslateKey = os.Getenv("YANDEX_TRANSLATE_API_KEY")
	yandexFolderID = os.Getenv("YANDEX_FOLDER_ID")
	// Yandex SpeechKit — расшифровка голосовых сообщений в текст по кнопке в чате, см.
	// speechkit.go. Отдельный ключ (роль ai.speechkit-stt.user), тот же folderId. Без ключа
	// кнопка «показать текст» в чате вернёт ошибку — сама расшифровка не обязательна для
	// работы чата.
	yandexSpeechKey = os.Getenv("YANDEX_SPEECHKIT_API_KEY")
	// Yandex Geocoder HTTP API — переводит адрес объявления (город/район/улица) в
	// координаты метки на карте, см. geocode.go. Тот же ключ, что и VITE_YANDEX_MAPS_API_KEY
	// на фронтенде (продукт "JavaScript API и HTTP Геокодер"). Без ключа или если геокодер
	// не нашёл адрес — координаты остаются старым фолбэком (случайная точка у центра города).
	yandexGeocoderKey = os.Getenv("YANDEX_MAPS_API_KEY")

	db = openDB(dbPath)
	defer db.Close()

	if err := os.MkdirAll(uploadsDir, 0o755); err != nil {
		log.Fatal("uploads dir: ", err)
	}
	if err := os.MkdirAll(privateDocumentsDir, 0o700); err != nil {
		log.Fatal("private documents dir: ", err)
	}
	if err := os.Chmod(privateDocumentsDir, 0o700); err != nil {
		log.Fatal("private documents dir chmod: ", err)
	}

	// демо-объявления — только по явному опту, не по DEV_MODE: пустая БД должна давать пустую
	// ленту и в деве, и в проде, если только их специально не попросили (см. seed.go).
	if seedDemoData, err := parseBool("SEED_DEMO_DATA", os.Getenv("SEED_DEMO_DATA")); err != nil {
		log.Fatal(err)
	} else if seedDemoData {
		seedIfEmpty()
	}
	// заводит супер-пользователя панели /control только один раз, пока таблица admins пуста —
	// см. admin_auth.go и README.md
	ensureBootstrapAdmin(envOr("ADMIN_USERNAME", ""), envOr("ADMIN_PASSWORD", ""))

	go func() {
		t := time.NewTicker(time.Minute)
		defer t.Stop()
		sweepExpiredListings()
		for range t.C {
			sweepExpiredListings()
		}
	}()

	startExchangeRatesRefresher()

	mux := http.NewServeMux()

	// health
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("GET /api/exchange-rates", handleGetExchangeRates)

	// аутентификация: телефон + пароль, SMS-код нужен только один раз — при регистрации
	// и при сбросе пароля (см. комментарий в начале auth.go)
	mux.HandleFunc("POST /api/auth/start", handleAuthStart)
	mux.HandleFunc("POST /api/auth/request-code", handleRequestCode)
	mux.HandleFunc("POST /api/auth/verify-code", handleVerifyCode)
	mux.HandleFunc("POST /api/auth/register", handleRegister)
	mux.HandleFunc("POST /api/auth/login", handleLogin)
	mux.HandleFunc("POST /api/auth/reset-password", handleResetPassword)
	mux.HandleFunc("POST /api/auth/logout", handleLogout)
	mux.HandleFunc("GET /api/me", requireAuth(handleMe))
	mux.HandleFunc("PUT /api/me", requireAuth(handleUpdateMe))
	mux.HandleFunc("PUT /api/me/phone", requireAuth(handleUpdatePhone))
	mux.HandleFunc("PUT /api/me/password", requireAuth(handleUpdatePassword))

	// объявления
	mux.HandleFunc("GET /api/listings", withUser(handleListListings))
	mux.HandleFunc("GET /api/listings/mine", requireAuth(handleMyListings))
	mux.HandleFunc("POST /api/listings", requireAuth(handleCreateListing))
	mux.HandleFunc("GET /api/listings/{id}", withUser(handleGetListing))
	mux.HandleFunc("PUT /api/listings/{id}", requireAuth(handleUpdateListing))
	mux.HandleFunc("DELETE /api/listings/{id}", requireAuth(handleDeleteListing))
	mux.HandleFunc("POST /api/listings/{id}/confirm", requireAuth(handleConfirmListing))
	mux.HandleFunc("POST /api/listings/{id}/mark-taken", requireAuth(handleMarkTaken))
	mux.HandleFunc("POST /api/listings/{id}/return-to-feed", requireAuth(handleReturnToFeed))
	mux.HandleFunc("POST /api/listings/{id}/report", requireAuth(handleReportListing))
	mux.HandleFunc("POST /api/listings/{id}/resolve", requireAuth(handleResolveReport))
	mux.HandleFunc("POST /api/listings/{id}/photos", requireAuth(handleUploadListingPhoto))
	mux.HandleFunc("DELETE /api/listings/{id}/photos", requireAuth(handleDeleteListingPhoto))
	mux.HandleFunc("POST /api/listings/{id}/videos", requireAuth(handleUploadListingVideo))
	mux.HandleFunc("DELETE /api/listings/{id}/videos", requireAuth(handleDeleteListingVideo))
	mux.HandleFunc("POST /api/listings/{id}/promote", requireAuth(handlePromoteListing))
	mux.HandleFunc("GET /api/listings/{id}/document", requireAuth(handleGetListingDocument))
	mux.HandleFunc("GET /api/listings/{id}/revision", requireAuth(handleGetListingRevision))

	// отели и хостелы: номера, календарь, брони — см. stays.go
	mux.HandleFunc("GET /api/listings/{id}/rooms", handleListRooms)
	mux.HandleFunc("POST /api/listings/{id}/rooms", requireAuth(handleCreateRoom))
	mux.HandleFunc("PUT /api/listings/{id}/rooms/{roomId}", requireAuth(handleUpdateRoom))
	mux.HandleFunc("DELETE /api/listings/{id}/rooms/{roomId}", requireAuth(handleDeleteRoom))
	mux.HandleFunc("GET /api/listings/{id}/rooms/{roomId}/calendar", requireAuth(handleRoomCalendar))
	mux.HandleFunc("PUT /api/listings/{id}/rooms/{roomId}/closures", requireAuth(handleSetClosures))
	mux.HandleFunc("POST /api/listings/{id}/bookings", requireAuth(handleCreateBooking))
	mux.HandleFunc("GET /api/bookings", requireAuth(handleListBookings))
	mux.HandleFunc("POST /api/bookings/{id}/decision", requireAuth(handleDecideBooking))
	mux.HandleFunc("POST /api/bookings/{id}/cancel", requireAuth(handleCancelBooking))

	// внутренние токены и VIP
	mux.HandleFunc("GET /api/tokens", requireAuth(handleGetTokens))

	// вложения (для чата)
	mux.HandleFunc("POST /api/uploads", requireAuth(handleGenericUpload))

	// избранное
	mux.HandleFunc("GET /api/favorites", requireAuth(handleListFavorites))
	mux.HandleFunc("POST /api/favorites/{id}", requireAuth(handleAddFavorite))
	mux.HandleFunc("DELETE /api/favorites/{id}", requireAuth(handleRemoveFavorite))

	// чат
	mux.HandleFunc("GET /api/threads", requireAuth(handleListThreads))
	mux.HandleFunc("POST /api/threads", requireAuth(handleOpenThread))
	mux.HandleFunc("GET /api/threads/{id}/messages", requireAuth(handleListMessages))
	mux.HandleFunc("POST /api/threads/{id}/messages", requireAuth(handleSendMessage))
	mux.HandleFunc("POST /api/threads/{id}/messages/{mid}/transcript", requireAuth(handleTranscribeMessage))
	mux.HandleFunc("POST /api/threads/{id}/read", requireAuth(handleMarkThreadRead))

	// поддержка
	mux.HandleFunc("GET /api/support/messages", requireAuth(handleListSupportMessages))
	mux.HandleFunc("POST /api/support/messages", requireAuth(handleSendSupportMessage))
	mux.HandleFunc("POST /api/support/messages/{mid}/transcript", requireAuth(handleTranscribeSupportMessage))
	mux.HandleFunc("POST /api/support/read", requireAuth(handleMarkSupportRead))

	mux.HandleFunc("POST /api/realtime/ticket", requireAuth(handleIssueRealtimeTicket))
	mux.HandleFunc("GET /api/realtime", handleRealtimeUpgrade)

	// заявки на повышение роли (agency/hotel) — применяются только через одобрение в админке
	mux.HandleFunc("POST /api/role-requests", requireAuth(handleCreateRoleRequest))
	mux.HandleFunc("GET /api/role-requests/me", requireAuth(handleMyRoleRequest))

	// панель администратора — отдельный логин/пароль, отдельные сессии (см. admin_auth.go),
	// обычные пользователи не имеют и не могут получить сюда доступ через свой аккаунт
	mux.HandleFunc("POST /api/admin/login", handleAdminLogin)
	mux.HandleFunc("POST /api/admin/logout", handleAdminLogout)
	mux.HandleFunc("GET /api/admin/users", requireAdminSession(handleAdminUsers))
	mux.HandleFunc("GET /api/admin/users/{id}", requireAdminSession(handleAdminUserDetail))
	mux.HandleFunc("PUT /api/admin/users/{id}", requireAdminSession(handleAdminUpdateUser))
	mux.HandleFunc("DELETE /api/admin/users/{id}", requireAdminSession(handleAdminDeleteUser))
	mux.HandleFunc("GET /api/admin/online", requireAdminSession(handleAdminOnline))
	mux.HandleFunc("POST /api/admin/users/{id}/support-thread", requireAdminSession(handleAdminOpenUserThread))
	mux.HandleFunc("GET /api/admin/reports", requireAdminSession(handleAdminReports))
	mux.HandleFunc("POST /api/admin/reports/{id}/resolve", requireAdminSession(handleAdminResolveReport))
	mux.HandleFunc("GET /api/admin/role-requests", requireAdminSession(handleAdminRoleRequests))
	mux.HandleFunc("POST /api/admin/role-requests/{id}/approve", requireAdminSession(handleAdminResolveRoleRequest(true)))
	mux.HandleFunc("POST /api/admin/role-requests/{id}/reject", requireAdminSession(handleAdminResolveRoleRequest(false)))
	mux.HandleFunc("GET /api/admin/listings", requireAdminSession(handleAdminListings))
	mux.HandleFunc("POST /api/admin/listings/{id}/status", requireAdminSession(handleAdminSetListingStatus))
	mux.HandleFunc("POST /api/admin/listings/regeocode", requireAdminSession(handleAdminRegeocodeListings))
	mux.HandleFunc("DELETE /api/admin/listings/{id}", requireAdminSession(handleAdminDeleteListing))
	mux.HandleFunc("GET /api/admin/listings/{id}/document", requireAdminSession(handleAdminGetListingDocument))
	mux.HandleFunc("GET /api/admin/revisions", requireAdminSession(handleAdminListRevisions))
	mux.HandleFunc("POST /api/admin/revisions/{id}/resolve", requireAdminSession(handleAdminResolveRevision))
	mux.HandleFunc("GET /api/admin/support/threads", requireAdminSession(handleAdminSupportThreads))
	mux.HandleFunc("GET /api/admin/support/threads/{id}/messages", requireAdminSession(handleAdminListSupportMessages))
	mux.HandleFunc("POST /api/admin/support/threads/{id}/messages", requireAdminSession(handleAdminSendSupportMessage))
	mux.HandleFunc("POST /api/admin/realtime/ticket", requireAdminSession(handleAdminIssueRealtimeTicket))

	// раздача загруженных файлов
	mux.Handle("GET /uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(uploadsDir))))

	handler := withSecurityHeaders(withCORS(corsOrigin, mux))

	log.Printf("hayhome-backend слушает на :%s (dev=%v, db=%s, uploads=%s, publicBaseURL=%s)", port, devMode, dbPath, uploadsDir, publicBaseURL)
	log.Printf("operator contact: %s (%s)", operatorEmail, operatorCity)
	log.Fatal(http.ListenAndServe(":"+port, handler))
}

// withSecurityHeaders выставляет базовые защитные заголовки на все ответы: чистый
// JSON API плюс статика /uploads/ (пользовательские фото/вложения) сама по себе не
// рендерит HTML, поэтому эти значения безопасно ставить глобально, без исключений
// под конкретные роуты. nosniff и CSP — вторая линия обороны на случай, если через
// /uploads/ всё же окажется файл, который браузер попробует исполнить как HTML/SVG.
func withSecurityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", "default-src 'none'")
		h.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		next.ServeHTTP(w, r)
	})
}

func withCORS(rawOrigins string, next http.Handler) http.Handler {
	origins := parseOrigins(rawOrigins)
	wildcard := originAllowed(origins, "*")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqOrigin := r.Header.Get("Origin")
		switch {
		case wildcard:
			w.Header().Set("Access-Control-Allow-Origin", "*")
		case reqOrigin != "" && originAllowed(origins, reqOrigin):
			w.Header().Set("Access-Control-Allow-Origin", reqOrigin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Lang, "+browserIDHeader)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
