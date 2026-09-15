package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "modernc.org/sqlite"
)

var db *sql.DB

const schema = `
CREATE TABLE IF NOT EXISTS users (
	id                TEXT PRIMARY KEY,
	phone             TEXT UNIQUE NOT NULL,
	name              TEXT NOT NULL DEFAULT '',
	role              TEXT NOT NULL DEFAULT 'tenant',
	ini               TEXT NOT NULL DEFAULT '',
	password_hash     TEXT NOT NULL DEFAULT '',
	password_salt     TEXT NOT NULL DEFAULT '',
	-- legal_version пустой и legal_accepted_at NULL означают «согласие не дано» —
	-- так остаются старые аккаунты после миграции, их нельзя считать принявшими условия.
	legal_version     TEXT NOT NULL DEFAULT '',
	legal_accepted_at DATETIME,
	legal_language    TEXT NOT NULL DEFAULT '',
	created_at        DATETIME NOT NULL DEFAULT (datetime('now'))
);

-- verified: код подтверждён, но окно ещё открыто — можно придумывать пароль
-- (регистрация) или задавать новый (сброс пароля), не вводя код повторно.
-- requested_at: когда код в последний раз отправлен — им же ограничивается повторная
-- отправка (см. otpResendCooldown в auth.go), не путать с expires_at, который после
-- verify продлевается на окно ввода пароля.
-- attempts: сколько раз подряд ввели неверный код для текущего code/expires_at —
-- см. otpMaxAttempts в auth.go. Сбрасывается в 0 при каждой новой отправке кода.
CREATE TABLE IF NOT EXISTS otp_codes (
	phone        TEXT PRIMARY KEY,
	code         TEXT NOT NULL,
	verified     INTEGER NOT NULL DEFAULT 0,
	expires_at   DATETIME NOT NULL,
	requested_at DATETIME,
	attempts     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
	token      TEXT PRIMARY KEY,
	user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
	id             TEXT PRIMARY KEY,
	owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	deal           TEXT NOT NULL,
	city           TEXT NOT NULL,
	district       TEXT NOT NULL DEFAULT '',
	street         TEXT NOT NULL DEFAULT '',
	lat            REAL NOT NULL DEFAULT 0,
	lng            REAL NOT NULL DEFAULT 0,
	price          INTEGER NOT NULL DEFAULT 0,
	rooms          INTEGER NOT NULL DEFAULT 0,
	area           INTEGER NOT NULL DEFAULT 0,
	floor          INTEGER NOT NULL DEFAULT 1,
	floors_total   INTEGER NOT NULL DEFAULT 1,
	features       TEXT NOT NULL DEFAULT '[]',
	description    TEXT NOT NULL DEFAULT '',
	deposit        TEXT NOT NULL DEFAULT '',
	cadastre_code  TEXT NOT NULL DEFAULT '', -- защитный код сертификата кадастра — см. README.md
	repair_condition TEXT NOT NULL DEFAULT 'unspecified',
	status         TEXT NOT NULL DEFAULT 'fresh',
	confirmed_at   DATETIME NOT NULL DEFAULT (datetime('now')),
	expires_at     DATETIME NOT NULL,
	created_at     DATETIME NOT NULL DEFAULT (datetime('now')),
	updated_at     DATETIME NOT NULL DEFAULT (datetime('now')),
	promoted_until DATETIME
);
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_deal_city ON listings(deal, city);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);

CREATE TABLE IF NOT EXISTS listing_photos (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	url        TEXT NOT NULL,
	position   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_listing ON listing_photos(listing_id);

CREATE TABLE IF NOT EXISTS listing_documents (
	id            TEXT PRIMARY KEY,
	listing_id    TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	original_name TEXT NOT NULL,
	stored_name   TEXT NOT NULL,
	mime_type     TEXT NOT NULL,
	size          INTEGER NOT NULL,
	sha256        TEXT NOT NULL,
	status        TEXT NOT NULL DEFAULT 'pending',
	created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
	UNIQUE (listing_id)
);
CREATE INDEX IF NOT EXISTS idx_listing_documents_listing ON listing_documents(listing_id);

CREATE TABLE IF NOT EXISTS listing_revisions (
	id          TEXT PRIMARY KEY,
	listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	payload     TEXT NOT NULL,
	status      TEXT NOT NULL DEFAULT 'pending',
	created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
	resolved_at DATETIME,
	resolved_by TEXT REFERENCES admins(id) ON DELETE SET NULL,
	reason      TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_revisions_one_pending ON listing_revisions(listing_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_listing_revisions_listing ON listing_revisions(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_revisions_status ON listing_revisions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
	user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_listing ON favorites(listing_id);

CREATE TABLE IF NOT EXISTS listing_views (
	listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	viewer_hash TEXT NOT NULL,
	created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (listing_id, viewer_hash)
);

CREATE TABLE IF NOT EXISTS reports (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	listing_id  TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	reason      TEXT NOT NULL DEFAULT '',
	text        TEXT NOT NULL DEFAULT '',
	status      TEXT NOT NULL DEFAULT 'pending',
	created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_listing ON reports(listing_id);

CREATE TABLE IF NOT EXISTS threads (
	id         TEXT PRIMARY KEY,
	listing_id TEXT NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
	tenant_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	owner_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	UNIQUE (listing_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS idx_threads_tenant ON threads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_threads_owner ON threads(owner_id);

CREATE TABLE IF NOT EXISTS messages (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	thread_id  TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
	sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	kind       TEXT NOT NULL DEFAULT 'text',
	text       TEXT NOT NULL DEFAULT '',
	url        TEXT NOT NULL DEFAULT '',
	name       TEXT NOT NULL DEFAULT '',
	size       INTEGER NOT NULL DEFAULT 0,
	dur        INTEGER NOT NULL DEFAULT 0,
	lat        REAL NOT NULL DEFAULT 0,
	lng        REAL NOT NULL DEFAULT 0,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	read_at    DATETIME
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);

CREATE TABLE IF NOT EXISTS support_threads (
	id         TEXT PRIMARY KEY,
	user_id    TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
	created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_messages (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	thread_id  TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
	sender     TEXT NOT NULL, -- user | admin
	kind       TEXT NOT NULL DEFAULT 'text',
	text       TEXT NOT NULL DEFAULT '',
	url        TEXT NOT NULL DEFAULT '',
	name       TEXT NOT NULL DEFAULT '',
	size       INTEGER NOT NULL DEFAULT 0,
	dur        INTEGER NOT NULL DEFAULT 0,
	lat        REAL NOT NULL DEFAULT 0,
	lng        REAL NOT NULL DEFAULT 0,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	read_at    DATETIME
);
CREATE INDEX IF NOT EXISTS idx_support_messages_thread ON support_messages(thread_id);

-- Панель администратора — полностью отдельная от обычных пользователей учётная система:
-- отдельный логин/пароль, отдельные сессии, ни один обычный пользователь никогда не может
-- получить сюда доступ через свой телефон. Заводится один раз при старте из
-- ADMIN_USERNAME/ADMIN_PASSWORD (см. main.go, ensureBootstrapAdmin в admin_auth.go).
CREATE TABLE IF NOT EXISTS admins (
	id            TEXT PRIMARY KEY,
	username      TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	password_salt TEXT NOT NULL,
	created_at    DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_sessions (
	token      TEXT PRIMARY KEY,
	admin_id   TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
	created_at DATETIME NOT NULL DEFAULT (datetime('now')),
	expires_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS token_balances (
	user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0)
);

CREATE TABLE IF NOT EXISTS token_transactions (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	amount     INTEGER NOT NULL CHECK (amount != 0),
	kind       TEXT NOT NULL,
	event_key  TEXT UNIQUE NOT NULL,
	listing_id TEXT REFERENCES listings(id) ON DELETE SET NULL,
	created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_token_tx_user ON token_transactions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS listing_outcomes (
	listing_id       TEXT PRIMARY KEY REFERENCES listings(id) ON DELETE CASCADE,
	owner_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	source           TEXT NOT NULL,
	closed_at        DATETIME NOT NULL,
	seconds_to_close INTEGER NOT NULL CHECK (seconds_to_close >= 0)
);
CREATE INDEX IF NOT EXISTS idx_listing_outcomes_owner ON listing_outcomes(owner_id);

CREATE TABLE IF NOT EXISTS exchange_rate_snapshot (
	id           INTEGER PRIMARY KEY CHECK (id = 1),
	usd_amount   REAL NOT NULL CHECK (usd_amount > 0),
	usd_rate     REAL NOT NULL CHECK (usd_rate > 0),
	rub_amount   REAL NOT NULL CHECK (rub_amount > 0),
	rub_rate     REAL NOT NULL CHECK (rub_rate > 0),
	published_at DATETIME NOT NULL,
	updated_at   DATETIME NOT NULL
);

-- Кэш переводов пользовательского текста (описания объявлений, сообщения чата) через
-- Yandex Translate, см. translate.go. hash = sha256(lang + текст), чтобы один и тот же
-- текст не переводился (и не оплачивался) повторно при каждом запросе.
CREATE TABLE IF NOT EXISTS translations (
	hash       TEXT NOT NULL,
	lang       TEXT NOT NULL,
	text       TEXT NOT NULL,
	created_at DATETIME NOT NULL,
	PRIMARY KEY (hash, lang)
);
`

func openDB(path string) *sql.DB {
	conn, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_txlock=immediate")
	if err != nil {
		log.Fatal("openDB: ", err)
	}
	// WAL допускает несколько параллельных читателей и одного писателя одновременно.
	// Небольшой пул нужен и для того, чтобы вложенные запросы (обогащение строк фото/автором
	// внутри цикла по другому результату) не ждали освобождения единственного соединения.
	conn.SetMaxOpenConns(8)
	if _, err := conn.Exec(schema); err != nil {
		log.Fatal("schema: ", err)
	}
	if err := migrate(conn); err != nil {
		log.Fatal("migrate: ", err)
	}
	return conn
}

func migrate(conn *sql.DB) error {
	alters := []string{
		`ALTER TABLE listings ADD COLUMN cadastre_code TEXT NOT NULL DEFAULT ''`,
		// вход по номеру телефона + паролю (пароль придумывается один раз после SMS-кода
		// при регистрации) — см. auth.go handleRegister/handleLogin/handleResetPassword.
		`ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN password_salt TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE otp_codes ADD COLUMN verified INTEGER NOT NULL DEFAULT 0`,
		// users.is_admin — остаток от более раннего варианта панели администратора, где
		// права выдавались обычным пользователям по номеру телефона. Теперь админ — отдельная
		// сущность (см. таблицу admins), колонка больше не читается и не пишется нигде в коде.
		`ALTER TABLE users DROP COLUMN is_admin`,
		// баланс/кошелёк убраны совсем (см. историю в git) — колонка и таблицы истории операций
		// и платежей больше не нужны, если они остались в уже существующей базе.
		`ALTER TABLE users DROP COLUMN balance`,
		`DROP TABLE IF EXISTS transactions`,
		`DROP TABLE IF EXISTS payments`,
		`ALTER TABLE listings ADD COLUMN promoted_until DATETIME`,
		`ALTER TABLE listings ADD COLUMN repair_condition TEXT NOT NULL DEFAULT 'unspecified'`,
		`ALTER TABLE users ADD COLUMN legal_version TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN legal_accepted_at DATETIME`,
		`ALTER TABLE users ADD COLUMN legal_language TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE otp_codes ADD COLUMN requested_at DATETIME`,
		`ALTER TABLE otp_codes ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
		// язык интерфейса пользователя — обновляется из X-Lang в withUser (auth.go) на каждом
		// аутентифицированном запросе, используется для перевода чата "под получателя" в
		// реальном времени, см. translate.go userLang / chat.go publishChatMessage.
		`ALTER TABLE users ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'`,
		// вложения в чате с поддержкой — раньше сообщения были только текстовые.
		`ALTER TABLE support_messages ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'`,
		`ALTER TABLE support_messages ADD COLUMN url TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE support_messages ADD COLUMN name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE support_messages ADD COLUMN size INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE support_messages ADD COLUMN dur INTEGER NOT NULL DEFAULT 0`,
		`ALTER TABLE support_messages ADD COLUMN lat REAL NOT NULL DEFAULT 0`,
		`ALTER TABLE support_messages ADD COLUMN lng REAL NOT NULL DEFAULT 0`,
	}
	for _, a := range alters {
		if _, err := conn.Exec(a); err != nil && !isIgnorableMigrationErr(err) {
			return fmt.Errorf("%s: %w", a, err)
		}
	}
	if _, err := conn.Exec(`CREATE INDEX IF NOT EXISTS idx_listings_promoted ON listings(promoted_until)`); err != nil {
		return fmt.Errorf("idx_listings_promoted: %w", err)
	}
	return nil
}

func isIgnorableMigrationErr(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "duplicate column name") || strings.Contains(msg, "no such column")
}
