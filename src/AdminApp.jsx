import { createStore } from 'solid-js/store';
import { For, Show, createSignal as sig, createEffect, onMount, onCleanup } from 'solid-js';
import { api, setAuthToken, ApiError, fileURL } from './api';
import { connectRealtime, disconnectRealtime } from './realtime';
import { readMigrated, safeSet, safeRemove } from './storage';
import Icon from './components/Icon';
import RevisionPanel from './admin/RevisionPanel';
import Sidebar from './admin/Sidebar';
import Donut from './admin/Donut';
import { plural, UNIT } from './admin/plural';
import { roomsLabel, priceOf } from './admin/adminFormat';
import { CITY, nf } from './data';
import {
  ACCENT,
  ACCENT_SOFT,
  ACCENT_ROW,
  SURFACE_ALT,
  FEED_BG,
  BORDER,
  BORDER_SOFT,
  DIVIDER,
  INK,
  TEXT,
  TEXT_MUTED,
  TEXT_FAINT,
  TEXT_GHOST,
  DANGER,
  DANGER_SOFT,
  DANGER_BORDER,
  WARN,
  WARN_SOFT,
  WARN_BORDER,
  WARN_ACCENT,
  NEUTRAL_SOFT,
  NEUTRAL_ACCENT,
  ONLINE,
  OVERLAY,
  MONO,
  rampColor
} from './admin/theme';

const TOKEN_KEY = 'hayhome.admin.token';
const LEGACY_TOKEN_KEY = 'bnak.admin.token';

const SUPPORT_ATTACH_LABEL = { image: '📷 Фото', video: '📹 Видео', audio: '🎤 Голосовое', location: '📍 Геолокация' };

function supportMsgText(m) {
  if (!m.kind || m.kind === 'text') return m.text || '';
  return SUPPORT_ATTACH_LABEL[m.kind] || '📄 ' + (m.name || 'Файл');
}

const ROLE_LABEL = { tenant: 'Ищет жильё', owner: 'Сдаёт своё жильё', agency: 'Агентство', hotel: 'Отель / хостел' };
const DEAL_LABEL = { rent: 'Аренда', daily: 'Посуточно', sale: 'Продажа', newb: 'Новостройки', comm: 'Коммерческая', hotel: 'Отель / хостел' };

const LISTING_STATUS = {
  pending: { label: 'Первичная модерация', bg: WARN_SOFT, fg: WARN },
  active: { label: 'Сегодня', bg: ACCENT_SOFT, fg: ACCENT },
  flagged: { label: 'Жалобы', bg: DANGER_SOFT, fg: DANGER },
  archived: { label: 'Архив', bg: NEUTRAL_SOFT, fg: TEXT_MUTED },
  rented: { label: 'Архив', bg: NEUTRAL_SOFT, fg: TEXT_MUTED }
};

const RESOLUTION = {
  pending: { label: 'На рассмотрении', bg: WARN_SOFT, fg: WARN, accent: WARN_ACCENT },
  dismissed: { label: 'Отклонено', bg: NEUTRAL_SOFT, fg: TEXT_MUTED, accent: NEUTRAL_ACCENT },
  upheld: { label: 'Подтверждено', bg: ACCENT_SOFT, fg: ACCENT, accent: ACCENT }
};

const REASON_LABEL = {
  rs1: 'Сказали, что квартира уже сдана, и предложили другой вариант',
  rs2: 'Никто не отвечает больше суток',
  rs3: 'Цена или условия на месте оказались другими',
  rs4: 'Фото не от этой квартиры'
};
const reasonText = (code) => REASON_LABEL[code] || code || '—';

const SECTION_META = {
  overview: { title: 'Обзор', sub: 'Сводка по объявлениям, пользователям и жалобам' },
  listings: { title: 'Объявления', sub: 'Модерация, типы сделок и география' },
  complaints: { title: 'Жалобы', sub: 'Разбор обращений: подтвердить, отклонить, написать автору' },
  users: { title: 'Пользователи', sub: 'Профили, роли, блокировка и удаление аккаунта' },
  agencies: { title: 'Агентства', sub: 'Объявления и статистика агентств недвижимости' },
  revisions: { title: 'Правки', sub: 'Изменения объявлений, ожидающие проверки' },
  support: { title: 'Поддержка', sub: 'Личный чат поддержки с каждым пользователем' }
};

function timeOf(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

function dateOnly(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear();
}

function shortId(id) {
  return id ? id.slice(0, 8).toUpperCase() : '—';
}

function cityLabel(city) {
  return CITY[city] ? CITY[city].n[1] : city;
}

function daysAgo(iso, days) {
  const d = new Date(iso);
  return !isNaN(d) && Date.now() - d.getTime() <= days * 86400000;
}

function countBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (k == null) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

function apiErrText(e) {
  if (e instanceof ApiError) {
    if (e.code === 'network') return 'Сервер недоступен, проверьте подключение';
    if (e.code === 'invalid credentials') return 'Неверный логин или пароль';
    if (e.code === 'phone_taken') return 'Этот номер уже используется другим аккаунтом';
    if (e.code === 'invalid input') return 'Заполните имя и телефон';
    if (e.code === 'invalid role' || e.code === 'invalid status') return 'Некорректные данные';
    if (e.code === 'not found') return 'Не найдено';
    return e.code;
  }
  return String((e && e.message) || e);
}

async function openPrivateDocument(listingId) {
  const blob = await api.blob('/api/admin/listings/' + listingId + '/document');
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function Login(props) {
  const [username, setUsername] = sig('');
  const [password, setPassword] = sig('');
  const [busy, setBusy] = sig(false);
  const [err, setErr] = sig('');

  const submit = async (e) => {
    e.preventDefault();
    if (!username() || !password()) return;
    setBusy(true);
    setErr('');
    try {
      const resp = await api.post('/api/admin/login', { username: username(), password: password() });
      safeSet(localStorage, TOKEN_KEY, resp.token);
      setAuthToken(resp.token);
      props.onLogin();
    } catch (e) {
      setErr(apiErrText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#fbfbfa">
      <form
        onSubmit={submit}
        style="width:100%;max-width:360px;background:#fff;border:1px solid #e3e3e0;border-radius:5px;padding:32px;animation:bnIn .2s ease"
      >
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:40px;height:40px;border-radius:10px;background:#16171a;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
            <Icon name="shield" size={19} stroke="#fff" weight={1.8} />
          </span>
          <div>
            <div style="font-size:18px;font-weight:700;letter-spacing:-.02em">Панель управления</div>
            <div style="font-size:13px;color:#6e7075;margin-top:2px">Только для администратора</div>
          </div>
        </div>

        <div style="margin-top:24px;display:flex;flex-direction:column;gap:12px">
          <input
            type="text"
            autocomplete="username"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            placeholder="Логин"
            style="width:100%;padding:11px 14px;border-radius:3px;border:1px solid #e3e3e0;background:#fbfbfa;font-size:14px"
          />
          <input
            type="password"
            autocomplete="current-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            placeholder="Пароль"
            style="width:100%;padding:11px 14px;border-radius:3px;border:1px solid #e3e3e0;background:#fbfbfa;font-size:14px"
          />
        </div>

        <Show when={err()}>
          <div style="margin-top:12px;padding:11px 13px;border-radius:3px;background:#fdf0eb;color:#9a3412;font-size:13px;font-weight:600">
            {err()}
          </div>
        </Show>

        <button
          type="submit"
          disabled={busy()}
          class="bn-tap"
          style={`margin-top:16px;width:100%;display:flex;align-items:center;justify-content:center;padding:12px;border-radius:3px;border:none;background:${busy() ? '#9ecbc5' : ACCENT};color:#fff;font-size:14px;font-weight:600;cursor:${busy() ? 'default' : 'pointer'}`}
        >
          Войти
        </button>
      </form>
    </div>
  );
}

function Badge(props) {
  return (
    <span style={`display:inline-block;padding:2px 7px;border-radius:2px;font-size:11px;background:${props.bg};color:${props.fg};white-space:nowrap`}>
      {props.children}
    </span>
  );
}

function Dot(props) {
  return <span style={`width:6px;height:6px;border-radius:50%;background:${props.on ? ONLINE : BORDER};flex:0 0 auto`} />;
}

const ACT_VARIANTS = {
  primary: `background:${ACCENT};color:#fff;border-color:${ACCENT}`,
  neutral: `background:#fff;color:${TEXT};border-color:${BORDER}`,
  danger: `background:#fff;color:${DANGER};border-color:${DANGER_BORDER}`,
  warn: `background:#fff;color:${WARN};border-color:${WARN_BORDER}`
};

function ActBtn(props) {
  return (
    <button
      type="button"
      class="bn-tap"
      onClick={props.onClick}
      style={`border:1px solid;cursor:pointer;font-size:11.5px;font-weight:500;padding:${props.big ? '7px 12px' : '4px 9px'};border-radius:3px;white-space:nowrap;${ACT_VARIANTS[props.variant || 'neutral']}`}
    >
      {props.children}
    </button>
  );
}

function KpiStrip(props) {
  const pct = () => 100 / props.items.length;
  return (
    <section style={`display:flex;flex-wrap:wrap;gap:1px;border:1px solid ${BORDER};border-radius:4px;background:${DIVIDER};margin-top:22px;overflow:hidden`}>
      <For each={props.items}>
        {(k) => (
          <div style={`flex:1 1 calc(${pct()}% - 1px);min-width:140px;background:#fff;padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px`}>
            <div style={`font-size:12px;font-weight:500;color:${TEXT_MUTED}`}>{k.label}</div>
            <div style={`font-family:${MONO};font-size:26px;font-weight:500;letter-spacing:-.02em;line-height:1;color:${k.danger ? DANGER : INK}`}>
              {k.value}
            </div>
          </div>
        )}
      </For>
    </section>
  );
}

function PageHeader(props) {
  const meta = () => SECTION_META[props.section()];
  return (
    <header
      style={`display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:18px;border-bottom:1px solid ${BORDER}`}
    >
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0">
        <h1 style="margin:0;font-size:26px;font-weight:600;letter-spacing:-.02em">{meta().title}</h1>
        <div style={`font-size:13px;color:${TEXT_MUTED}`}>{meta().sub}</div>
      </div>
      <div style={`display:flex;align-items:center;gap:8px;font-family:${MONO};font-size:11px;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:.06em`}>
        <span style={`width:6px;height:6px;border-radius:50%;background:${ACCENT}`} />
        <span>данные актуальны</span>
      </div>
    </header>
  );
}

function ListingDetailPanel(props) {
  const l = () => props.listing;
  const rows = () => [
    ['Адрес', [cityLabel(l().city), l().street].filter(Boolean).join(', ') || '—'],
    ['Кадастровый номер', l().cadastreCode || 'не указан'],
    ['Владелец', props.owner?.name || '—'],
    ['Телефон владельца', props.owner?.phone || '—']
  ];
  return (
    <div style={`padding:16px;background:${SURFACE_ALT};border-bottom:1px solid ${BORDER};display:flex;flex-direction:column;gap:14px`}>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
        <For each={rows()}>
          {([label, value]) => (
            <div style="display:flex;flex-direction:column;gap:3px">
              <span style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>{label}</span>
              <span style="font-size:13px;word-break:break-word">{value}</span>
            </div>
          )}
        </For>
      </div>

      <div>
        <div style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT};margin-bottom:6px`}>
          Описание
        </div>
        <div style="font-size:13px;line-height:1.55;white-space:pre-line;max-width:72ch">{l().desc || 'Описание не заполнено'}</div>
      </div>

      <Show when={(l().photos || []).length}>
        <div>
          <div style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT};margin-bottom:6px`}>
            Фотографии ({l().photos.length})
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <For each={l().photos}>
              {(url) => (
                <a href={url} target="_blank" rel="noreferrer" style="display:block;width:96px;height:76px;border-radius:3px;overflow:hidden;border:1px solid #e3e3e0">
                  <img src={url} alt="" style="width:100%;height:100%;object-fit:cover;display:block" />
                </a>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={(l().videos || []).length}>
        <div>
          <div style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT};margin-bottom:6px`}>
            Видео ({l().videos.length})
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <For each={l().videos}>
              {(url) => <video src={url} controls style="width:180px;height:110px;border-radius:3px;background:#000" />}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

function ListingsTable(props) {
  const [openId, setOpenId] = sig(null);
  const cols = 'grid-template-columns:92px 108px 100px 122px 122px 74px minmax(0,1fr) 280px';
  return (
    <section style={`border:1px solid ${BORDER};border-radius:4px;background:#fff;margin-top:16px;overflow-x:auto`}>
      <div style="min-width:1020px">
        <div
          style={`display:grid;${cols};gap:12px;padding:10px 16px;border-bottom:1px solid ${BORDER};background:${SURFACE_ALT};font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}
        >
          <div>ID</div>
          <div>Сделка</div>
          <div>Город</div>
          <div>Цена</div>
          <div>Статус</div>
          <div>Кадастр</div>
          <div>Владелец</div>
          <div>Действия</div>
        </div>
        <Show when={props.rows.length === 0}>
          <div style={`padding:32px 20px;text-align:center;font-size:13px;color:${TEXT_GHOST}`}>Объявлений нет</div>
        </Show>
        <For each={props.rows}>
          {(item) => {
            const l = item.listing;
            const st = LISTING_STATUS[l.status] || LISTING_STATUS.archived;
            const open = () => openId() === l.id;
            const acts = [{ label: open() ? 'Скрыть' : 'Подробнее', variant: 'neutral', onClick: () => setOpenId(open() ? null : l.id) }];
            if (l.status === 'pending') acts.push({ label: 'Документ', variant: 'neutral', onClick: () => openPrivateDocument(l.id) });
            if (l.status === 'pending' || l.status === 'flagged')
              acts.push({ label: 'Одобрить', variant: 'primary', onClick: () => props.onStatus(l.id, 'active') });
            if (l.status === 'active' || l.status === 'flagged')
              acts.push({ label: 'В архив', variant: 'neutral', onClick: () => props.onStatus(l.id, 'archived') });
            if (l.status === 'archived' || l.status === 'rented')
              acts.push({ label: 'Вернуть в выдачу', variant: 'primary', onClick: () => props.onStatus(l.id, 'active') });
            acts.push({ label: 'Написать автору', variant: 'neutral', onClick: () => props.onChat(l.ownerId) });
            acts.push({ label: 'Удалить', variant: 'danger', onClick: () => props.onDelete(l.id) });
            return (
              <div style={`border-bottom:1px solid ${BORDER_SOFT}`}>
                <div style={`display:grid;${cols};gap:12px;padding:11px 16px;align-items:center;font-size:12.5px`}>
                  <div style={`font-family:${MONO};font-size:11px;color:${TEXT_MUTED}`} title={l.id}>
                    {shortId(l.id)}
                  </div>
                  <div>{DEAL_LABEL[l.deal] || l.deal}</div>
                  <div>{cityLabel(l.city)}</div>
                  <div style={`font-family:${MONO};font-size:12px`}>{priceOf(l)}</div>
                  <div>
                    <Badge bg={st.bg} fg={st.fg}>
                      {st.label}
                    </Badge>
                  </div>
                  <div style={`font-size:11.5px;color:${l.cadastreCode ? TEXT_MUTED : DANGER}`}>{l.cadastreCode ? 'есть' : 'нет'}</div>
                  <div style={`overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${TEXT}`}>{item.owner?.name || '—'}</div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <For each={acts}>{(a) => <ActBtn variant={a.variant} onClick={a.onClick}>{a.label}</ActBtn>}</For>
                  </div>
                </div>
                <Show when={open()}>
                  <ListingDetailPanel listing={l} owner={item.owner} />
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </section>
  );
}

const SUPPORT_BOTTOM_THRESHOLD = 80;

function SupportPanel(props) {
  const [threads, setThreads] = sig([]);
  const [activeId, setActiveId] = sig(null);
  const [messages, setMessages] = sig([]);
  const [draft, setDraft] = sig('');
  const [showScrollDown, setShowScrollDown] = sig(false);
  let listRef;
  // Не сигнал: читается эффектом ниже, но не должен запускать его сам по себе —
  // иначе checkBottom() (вызывается из onScroll) зациклит createEffect.
  let atBottom = true;

  const checkBottom = () => {
    if (!listRef) return atBottom;
    const dist = listRef.scrollHeight - listRef.scrollTop - listRef.clientHeight;
    setShowScrollDown(dist > 120);
    atBottom = dist <= SUPPORT_BOTTOM_THRESHOLD;
    return atBottom;
  };

  const scrollToBottom = () => {
    if (!listRef) return;
    listRef.scrollTo({ top: listRef.scrollHeight, behavior: 'smooth' });
  };

  const loadThreads = async () => {
    try {
      setThreads(await api.get('/api/admin/support/threads'));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };

  const openThread = async (id) => {
    atBottom = true;
    setShowScrollDown(false);
    setActiveId(id);
    try {
      setMessages(await api.get('/api/admin/support/threads/' + id + '/messages'));
      setThreads((list) => list.map((t) => (t.threadId === id ? { ...t, unread: 0 } : t)));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };

  onMount(loadThreads);

  createEffect(() => {
    props.onCountChange(threads().reduce((n, t) => n + (t.unread || 0), 0));
  });

  // Автоскролл вниз только если админ уже был внизу (или тред только что открыт) —
  // если он читает историю выше, новое сообщение не должно дёргать список вниз.
  createEffect(() => {
    messages().length;
    if (listRef && atBottom)
      queueMicrotask(() => {
        listRef.scrollTop = listRef.scrollHeight;
        checkBottom();
      });
  });

  createEffect(() => {
    const data = props.event();
    if (!data || !data.threadId) return;
    if (data.threadId === activeId()) {
      setMessages((list) => (list.some((m) => m.id === data.message.id) ? list : [...list, data.message]));
    }
    loadThreads();
  });

  createEffect(() => {
    const uid = props.focusUserId();
    if (!uid) return;
    (async () => {
      try {
        const { threadId } = await api.post('/api/admin/users/' + uid + '/support-thread');
        await loadThreads();
        await openThread(threadId);
      } catch (e) {
        if (e.status === 401) props.onUnauthorized();
      } finally {
        props.onFocusHandled();
      }
    })();
  });

  const send = async (e) => {
    e.preventDefault();
    const text = draft().trim();
    const id = activeId();
    if (!text || !id) return;
    setDraft('');
    try {
      const message = await api.post('/api/admin/support/threads/' + id + '/messages', { text });
      setMessages((list) => [...list, message]);
      loadThreads();
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };

  const active = () => threads().find((t) => t.threadId === activeId());
  const onlineOf = (userId) => props.users().find((u) => u.id === userId)?.online;
  const canSend = () => !!draft().trim() && !!activeId();

  return (
    <section style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;align-items:stretch">
      <div style={`flex:1 1 300px;min-width:0;border:1px solid ${BORDER};border-radius:4px;background:#fff;overflow:hidden;align-self:flex-start`}>
        <div style={`padding:12px 16px;border-bottom:1px solid ${BORDER};background:${SURFACE_ALT};font-size:13px;font-weight:600`}>
          Диалоги с поддержкой
        </div>
        <Show when={threads().length === 0}>
          <div style={`padding:32px 20px;text-align:center;font-size:13px;color:${TEXT_GHOST}`}>Обращений нет</div>
        </Show>
        <For each={threads()}>
          {(th) => {
            const active_ = () => th.threadId === activeId();
            const unread = () => th.unread > 0;
            return (
              <button
                type="button"
                onClick={() => openThread(th.threadId)}
                style={`width:100%;text-align:left;border:0;border-bottom:1px solid ${BORDER_SOFT};border-left:3px solid ${active_() ? ACCENT : unread() ? DANGER : 'transparent'};background:${active_() ? ACCENT_ROW : '#fff'};cursor:pointer;padding:11px 14px;display:flex;flex-direction:column;gap:4px`}
              >
                <span style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                  <span style="display:flex;align-items:center;gap:7px;min-width:0">
                    <Dot on={onlineOf(th.user.id)} />
                    <span
                      style={`font-size:13px;font-weight:${unread() ? 600 : 400};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`}
                    >
                      {th.user.name || th.user.phone}
                    </span>
                  </span>
                  <span style={`font-family:${MONO};font-size:10.5px;color:${TEXT_GHOST}`}>
                    {th.lastMessage ? dateOnly(th.lastMessage.createdAt) : ''}
                  </span>
                </span>
                <span style={`font-size:11.5px;color:${TEXT_MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`}>
                  {th.lastMessage ? (th.lastMessage.sender === 'admin' ? 'Вы: ' : '') + supportMsgText(th.lastMessage) : 'Нет сообщений'}
                </span>
              </button>
            );
          }}
        </For>
      </div>

      <div style={`flex:1 1 420px;min-width:0;border:1px solid ${BORDER};border-radius:4px;background:#fff;display:flex;flex-direction:column`}>
        <Show
          when={activeId()}
          fallback={<div style={`margin:auto;padding:26px 18px;font-size:12.5px;color:${TEXT_FAINT}`}>Выберите диалог слева.</div>}
        >
          <div style="display:flex;flex-direction:column;height:640px">
            <div style={`padding:13px 16px;border-bottom:1px solid ${BORDER};display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;flex:0 0 auto`}>
              <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
                <div style="font-size:14px;font-weight:600">{active() ? active().user.name || active().user.phone : ''}</div>
                <div style={`font-family:${MONO};font-size:11px;color:${TEXT_FAINT}`}>{active() ? active().user.phone : ''}</div>
              </div>
              <button
                type="button"
                class="bn-tap"
                onClick={() => props.onOpenUser(active().user.id)}
                style={`border:1px solid ${BORDER};background:#fff;color:${ACCENT};cursor:pointer;font-size:12px;font-weight:500;padding:6px 11px;border-radius:3px`}
              >
                Профиль
              </button>
            </div>
            <div style="position:relative;flex:1;min-height:0;display:flex;flex-direction:column">
              <div
                ref={listRef}
                onScroll={checkBottom}
                style={`flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:${FEED_BG}`}
              >
                <For each={messages()}>
                  {(m) => {
                    const mine = m.sender === 'admin';
                    return (
                      <div style={`max-width:76%;align-self:${mine ? 'flex-end' : 'flex-start'};background:${mine ? ACCENT : '#fff'};color:${mine ? '#fff' : INK};border:1px solid ${mine ? ACCENT : BORDER};border-radius:6px;padding:9px 12px;display:flex;flex-direction:column;gap:4px`}>
                        <Show
                          when={m.kind && m.kind !== 'text' && m.url}
                          fallback={
                            <span style="font-size:13px;line-height:1.45;white-space:pre-wrap;word-break:break-word">{supportMsgText(m)}</span>
                          }
                        >
                          <a
                            href={fileURL(m.url)}
                            target="_blank"
                            rel="noreferrer"
                            style={`font-size:13px;line-height:1.45;word-break:break-word;color:inherit;text-decoration:underline`}
                          >
                            {supportMsgText(m)}
                          </a>
                        </Show>
                        <span style={`font-family:${MONO};font-size:10px;color:${mine ? 'rgba(255,255,255,.7)' : TEXT_GHOST};align-self:flex-end`}>
                          {timeOf(m.createdAt)}
                        </span>
                      </div>
                    );
                  }}
                </For>
              </div>
              <Show when={showScrollDown()}>
                <button
                  type="button"
                  class="bn-tap"
                  aria-label="Вниз, к последним сообщениям"
                  onClick={scrollToBottom}
                  style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:34px;height:34px;border-radius:999px;background:#fff;box-shadow:0 10px 24px -8px rgba(28,27,25,.35);display:flex;align-items:center;justify-content:center;color:#4a4844;border:0;cursor:pointer"
                >
                  <Icon name="down" size={16} weight={2.2} />
                </button>
              </Show>
            </div>
            <form onSubmit={send} style={`border-top:1px solid ${BORDER};padding:12px 16px;display:flex;gap:10px;align-items:flex-end;flex:0 0 auto`}>
              <textarea
                value={draft()}
                onInput={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(e);
                  }
                }}
                placeholder="Ответ пользователю… (Enter — отправить)"
                rows="2"
                style={`flex:1;min-width:0;resize:vertical;border:1px solid ${BORDER};border-radius:3px;padding:9px 10px;font-size:13px;line-height:1.45;background:#fff;color:${INK}`}
              />
              <button
                type="submit"
                disabled={!canSend()}
                class="bn-tap"
                style={`border:1px solid;font-size:12.5px;font-weight:500;padding:9px 15px;border-radius:3px;white-space:nowrap;${canSend() ? `background:${ACCENT};color:#fff;border-color:${ACCENT};cursor:pointer` : `background:${NEUTRAL_SOFT};color:${TEXT_GHOST};border-color:${BORDER};cursor:default`}`}
              >
                Отправить
              </button>
            </form>
          </div>
        </Show>
      </div>
    </section>
  );
}

function UserRow(props) {
  const u = () => props.user;
  const active = () => u().id === props.selectedId;
  const blocked = () => u().status === 'blocked';
  return (
    <button
      type="button"
      onClick={() => props.onSelect(u().id)}
      style={`width:100%;text-align:left;border:0;border-bottom:1px solid ${BORDER_SOFT};border-left:3px solid ${active() ? ACCENT : 'transparent'};background:${active() ? ACCENT_ROW : '#fff'};cursor:pointer;padding:11px 16px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center`}
    >
      <span style="display:flex;flex-direction:column;gap:3px;min-width:0">
        <span style="display:flex;align-items:center;gap:7px;min-width:0">
          <Dot on={u().online} />
          <span style="font-size:13.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{u().name}</span>
        </span>
        <span style={`font-size:11.5px;color:${TEXT_MUTED};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`}>
          {(ROLE_LABEL[u().role] || u().role) + ' · ' + u().phone}
        </span>
      </span>
      <span style="display:flex;align-items:center;gap:8px">
        <Show when={u().unreadSupport > 0}>
          <Badge bg={DANGER_SOFT} fg={DANGER}>
            {u().unreadSupport} непрочит.
          </Badge>
        </Show>
        <Badge bg={blocked() ? DANGER_SOFT : ACCENT_SOFT} fg={blocked() ? DANGER : ACCENT}>
          {blocked() ? 'Заблокирован' : 'Активен'}
        </Badge>
      </span>
    </button>
  );
}

function UserDetail(props) {
  const detail = () => props.detail;
  const u = () => detail()?.user;
  const draft = () => props.draft;
  const dirty = () => !!draft();
  const field = (key) => draft() ? draft()[key] : u()[key];
  const setField = (key, val) => props.onDraft({ ...(draft() || { name: u().name, phone: u().phone, role: u().role, status: u().status }), [key]: val });

  return (
    <Show when={u()} fallback={<div style={`padding:26px 18px;font-size:12.5px;color:${TEXT_FAINT};line-height:1.5`}>Выберите пользователя слева, чтобы отредактировать профиль, написать в чат или удалить аккаунт.</div>}>
      <div style="display:flex;flex-direction:column">
        <div style={`padding:16px;border-bottom:1px solid ${BORDER};display:flex;flex-direction:column;gap:3px`}>
          <div style="display:flex;align-items:center;gap:8px">
            <Dot on={u().online} />
            <div style="font-size:16px;font-weight:600;letter-spacing:-.01em">{u().name}</div>
          </div>
          <div style={`font-family:${MONO};font-size:11px;color:${TEXT_FAINT}`}>
            {shortId(u().id)} · {u().phone} · с {dateOnly(u().createdAt)}
          </div>
        </div>

        <div style={`padding:16px;display:flex;flex-direction:column;gap:14px;border-bottom:1px solid ${BORDER}`}>
          <label style="display:flex;flex-direction:column;gap:5px">
            <span style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>Имя</span>
            <input
              value={field('name')}
              onInput={(e) => setField('name', e.currentTarget.value)}
              style={`border:1px solid ${BORDER};border-radius:3px;padding:7px 9px;font-size:13px;background:#fff;color:${INK}`}
            />
          </label>
          <label style="display:flex;flex-direction:column;gap:5px">
            <span style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>Телефон</span>
            <input
              value={field('phone')}
              onInput={(e) => setField('phone', e.currentTarget.value)}
              style={`border:1px solid ${BORDER};border-radius:3px;padding:7px 9px;font-size:13px;background:#fff;color:${INK}`}
            />
          </label>

          <div style="display:flex;flex-direction:column;gap:6px">
            <span style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>Роль</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <For each={Object.keys(ROLE_LABEL)}>
                {(k) => {
                  const on = () => field('role') === k;
                  return (
                    <button
                      type="button"
                      class="bn-tap"
                      onClick={() => setField('role', k)}
                      style={`border:1px solid ${on() ? ACCENT : BORDER};background:${on() ? ACCENT : '#fff'};color:${on() ? '#fff' : TEXT};cursor:pointer;font-size:12px;padding:5px 10px;border-radius:3px`}
                    >
                      {ROLE_LABEL[k]}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px">
            <span style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>Статус</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              {[
                ['active', 'Активен'],
                ['blocked', 'Заблокирован']
              ].map(([k, label]) => {
                const on = () => field('status') === k;
                const activeColor = k === 'blocked' ? DANGER : ACCENT;
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => setField('status', k)}
                    style={`border:1px solid ${on() ? activeColor : BORDER};background:${on() ? activeColor : '#fff'};color:${on() ? '#fff' : TEXT};cursor:pointer;font-size:12px;padding:5px 10px;border-radius:3px`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={`padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid ${BORDER}`}>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button
              type="button"
              class="bn-tap"
              disabled={!dirty()}
              onClick={() => props.onSave()}
              style={`border:1px solid ${dirty() ? ACCENT : BORDER};background:${dirty() ? ACCENT : NEUTRAL_SOFT};color:${dirty() ? '#fff' : TEXT_GHOST};cursor:${dirty() ? 'pointer' : 'default'};font-size:12.5px;font-weight:500;padding:7px 13px;border-radius:3px`}
            >
              {dirty() ? 'Сохранить' : 'Сохранено'}
            </button>
            <button
              type="button"
              class="bn-tap"
              onClick={() => props.onDraft(null)}
              style={`border:1px solid ${BORDER};background:#fff;color:${TEXT};cursor:pointer;font-size:12.5px;padding:7px 13px;border-radius:3px`}
            >
              Отмена
            </button>
          </div>
          <button
            type="button"
            class="bn-tap"
            onClick={() => props.onChat()}
            style={`border:1px solid ${BORDER};background:#fff;color:${ACCENT};cursor:pointer;font-size:12.5px;font-weight:500;padding:7px 13px;border-radius:3px`}
          >
            Чат с поддержкой
          </button>
        </div>

        <div style={`padding:14px 16px;border-bottom:1px solid ${BORDER};display:flex;flex-direction:column;gap:4px`}>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:4px">
            <span style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>
              Объявления пользователя
            </span>
            <span style={`font-family:${MONO};font-size:10.5px;color:${TEXT_GHOST}`}>
              {detail().listings.length} {plural(detail().listings.length, UNIT.listing)}
            </span>
          </div>
          <Show
            when={detail().listings.length}
            fallback={<div style={`font-size:12px;color:${TEXT_GHOST};padding:4px 0`}>У пользователя нет объявлений</div>}
          >
            <For each={detail().listings}>
              {(l) => {
                const st = LISTING_STATUS[l.status] || LISTING_STATUS.archived;
                const off = l.status === 'archived' || l.status === 'rented';
                return (
                  <div style={`display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;border-top:1px solid ${BORDER_SOFT};padding:8px 0`}>
                    <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
                      <span style="font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                        {roomsLabel(l)}, {l.area} m² · {DEAL_LABEL[l.deal]} · {cityLabel(l.city)}
                      </span>
                      <span style="display:flex;align-items:center;gap:7px">
                        <span style={`font-family:${MONO};font-size:11px;color:${TEXT_MUTED}`}>{priceOf(l)}</span>
                        <Badge bg={st.bg} fg={st.fg}>
                          {st.label}
                        </Badge>
                      </span>
                    </div>
                    <ActBtn variant={off ? 'primary' : 'danger'} onClick={() => props.onListingStatus(l.id, off ? 'active' : 'archived')}>
                      {off ? 'Вернуть' : 'Снять'}
                    </ActBtn>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>

        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:10px">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:10px">
            {[
              [detail().listings.length, 'объявлений'],
              [detail().complaintsFiled, 'жалоб подано'],
              [detail().messagesCount, 'сообщений']
            ].map(([value, label]) => (
              <div style="display:flex;flex-direction:column;gap:2px">
                <span style={`font-family:${MONO};font-size:18px`}>{value}</span>
                <span style={`font-size:11px;color:${TEXT_FAINT};line-height:1.25`}>{label}</span>
              </div>
            ))}
          </div>
          <button
            type="button"
            class="bn-tap"
            onClick={() => props.onDeleteRequest(u())}
            style={`align-self:flex-start;border:1px solid ${DANGER_BORDER};background:#fff;color:${DANGER};cursor:pointer;font-size:12.5px;padding:7px 13px;border-radius:3px`}
          >
            Удалить аккаунт
          </button>
        </div>
      </div>
    </Show>
  );
}

function Panel(props) {
  const [section, setSection] = sig('overview');
  const [data, setData] = createStore({ users: [], reports: [], listings: [] });
  const [sel, setSel] = createStore({ status: null, deal: null, city: null, role: null, resolution: null });
  const [revisionsCount, setRevisionsCount] = sig(0);
  const [supportUnread, setSupportUnread] = sig(0);
  const [supportEvent, setSupportEvent] = sig(null);
  const [onlineCount, setOnlineCount] = sig(0);
  const [toast, setToast] = sig(null);

  const [userQuery, setUserQuery] = sig('');
  const [userFilter, setUserFilter] = sig('all');
  const [selectedUserId, setSelectedUserId] = sig(null);
  const [userDetail, setUserDetail] = sig(null);
  const [userDraft, setUserDraft] = sig(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = sig(null);
  const [focusSupportUserId, setFocusSupportUserId] = sig(null);

  const [complaintFilter, setComplaintFilter] = sig('all');
  const [selectedComplaintId, setSelectedComplaintId] = sig(null);

  let toastTimer;
  const flash = (msg) => {
    clearTimeout(toastTimer);
    setToast(msg);
    toastTimer = setTimeout(() => setToast(null), 2200);
  };

  const loadUsers = async () => {
    try {
      setData('users', await api.get('/api/admin/users'));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const loadReports = async () => {
    try {
      setData('reports', await api.get('/api/admin/reports'));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const loadListings = async () => {
    try {
      setData('listings', await api.get('/api/admin/listings'));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const loadRevisionsCount = async () => {
    try {
      const list = await api.get('/api/admin/revisions?status=pending');
      setRevisionsCount(list.length);
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const loadOnline = async () => {
    try {
      const { count } = await api.get('/api/admin/online');
      setOnlineCount(count);
    } catch {}
  };
  const loadAll = () => {
    loadUsers();
    loadReports();
    loadListings();
    loadRevisionsCount();
    loadOnline();
  };

  onMount(loadAll);
  onMount(() => {
    const t = setInterval(() => {
      loadUsers();
      loadOnline();
    }, 15000);
    onCleanup(() => clearInterval(t));
  });

  createEffect(() => {
    if (!selectedComplaintId() && data.reports.length) setSelectedComplaintId(data.reports[0].report.id);
  });

  onMount(() => {
    connectRealtime({
      ticketPath: '/api/admin/realtime/ticket',
      onMessage: (type, data) => {
        if (type === 'support.message') setSupportEvent({ ...data, seq: Date.now() });
      },
      onStatus: () => {}
    });
  });
  onCleanup(disconnectRealtime);

  const resolveReport = async (id, action) => {
    try {
      await api.post('/api/admin/reports/' + id + '/resolve', { action });
      await Promise.all([loadReports(), loadListings()]);
      flash(action === 'uphold' ? 'Жалоба подтверждена' : 'Жалоба отклонена');
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const setListingStatus = async (id, status) => {
    try {
      await api.post('/api/admin/listings/' + id + '/status', { status });
      await loadListings();
      if (selectedUserId()) selectUser(selectedUserId());
      flash('Статус обновлён');
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const deleteListing = async (id) => {
    try {
      await api.del('/api/admin/listings/' + id);
      await Promise.all([loadListings(), loadReports()]);
      flash('Объявление удалено');
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };

  const selectUser = async (id) => {
    setSelectedUserId(id);
    setUserDraft(null);
    try {
      setUserDetail(await api.get('/api/admin/users/' + id));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const openUser = (id) => {
    setSection('users');
    selectUser(id);
  };
  const saveUser = async () => {
    const id = selectedUserId();
    const draft = userDraft();
    if (!id || !draft) return;
    try {
      await api.put('/api/admin/users/' + id, draft);
      await Promise.all([loadUsers(), selectUser(id)]);
      setUserDraft(null);
      flash('Сохранено');
    } catch (e) {
      flash(apiErrText(e));
    }
  };
  const confirmDelete = async () => {
    const u = confirmDeleteUser();
    if (!u) return;
    try {
      await api.del('/api/admin/users/' + u.id);
      setConfirmDeleteUser(null);
      if (selectedUserId() === u.id) {
        setSelectedUserId(null);
        setUserDetail(null);
      }
      await Promise.all([loadUsers(), loadListings()]);
      flash('Аккаунт ' + u.name + ' удалён');
    } catch (e) {
      flash(apiErrText(e));
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/admin/logout');
    } catch {}
    disconnectRealtime();
    safeRemove(localStorage, TOKEN_KEY);
    safeRemove(localStorage, LEGACY_TOKEN_KEY);
    setAuthToken(null);
    props.onUnauthorized();
  };

  const listingsArr = () => data.listings.map((it) => it.listing);

  const statusItems = () => {
    const buckets = { pending: 0, active: 0, flagged: 0, archived: 0 };
    listingsArr().forEach((l) => {
      if (l.status === 'rented') buckets.archived++;
      else if (buckets[l.status] !== undefined) buckets[l.status]++;
    });
    return Object.keys(buckets)
      .filter((k) => buckets[k] > 0)
      .map((k, i) => ({ key: k, label: LISTING_STATUS[k].label, value: buckets[k], color: rampColor(i) }));
  };
  const dealItems = () => {
    const m = countBy(listingsArr(), (l) => l.deal);
    return Object.keys(DEAL_LABEL)
      .filter((k) => m.has(k))
      .map((k, i) => ({ key: k, label: DEAL_LABEL[k], value: m.get(k), color: rampColor(i) }));
  };
  const cityItems = () => {
    const m = countBy(listingsArr(), (l) => l.city);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ key: k, label: cityLabel(k), value: v, color: rampColor(i) }));
  };
  const roleItems = () => {
    const m = countBy(data.users, (u) => u.role);
    return Object.keys(ROLE_LABEL)
      .filter((k) => m.has(k))
      .map((k, i) => ({ key: k, label: ROLE_LABEL[k], value: m.get(k), color: rampColor(i) }));
  };
  const resolutionItems = () => {
    const m = countBy(data.reports, (r) => r.report.status);
    return Object.keys(RESOLUTION)
      .filter((k) => m.has(k))
      .map((k, i) => ({ key: k, label: RESOLUTION[k].label, value: m.get(k), color: rampColor(i) }));
  };

  const noCadastreCount = () => listingsArr().filter((l) => !l.cadastreCode).length;
  const avgPrice = () => {
    const prices = listingsArr()
      .map((l) => l.price)
      .filter((p) => typeof p === 'number' && p > 0);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  };
  const newListings7d = () => listingsArr().filter((l) => daysAgo(l.createdAt, 7)).length;
  const newUsers7d = () => data.users.filter((u) => daysAgo(u.createdAt, 7)).length;
  const kpiBase = () => [
    { label: 'Без кадастра', value: String(noCadastreCount()), danger: noCadastreCount() > 0 },
    { label: 'Средняя цена', value: avgPrice() ? nf(avgPrice()) + ' ֏' : '—' },
    { label: 'Объявлений за 7 дней', value: String(newListings7d()) },
    { label: 'Пользователей за 7 дней', value: String(newUsers7d()) }
  ];

  const navCounts = () => ({
    overview: data.reports.filter((r) => r.report.status === 'pending').length + listingsArr().filter((l) => l.status === 'pending').length,
    listings: listingsArr().length,
    complaints: data.reports.filter((r) => r.report.status === 'pending').length,
    users: data.users.length,
    agencies: data.users.filter((u) => u.role === 'agency').length,
    revisions: revisionsCount(),
    support: supportUnread()
  });

  return (
    <div style="min-height:100vh;display:grid;grid-template-columns:232px minmax(0,1fr);font-family:inherit;color:#16171a;background:#fbfbfa">
      <Sidebar section={section} onSelect={setSection} counts={navCounts()} />

      <main style="min-width:0;padding:28px 32px 72px">
        <div style="display:flex;justify-content:flex-end;margin-bottom:-6px">
          <button
            type="button"
            class="bn-tap"
            onClick={logout}
            style={`padding:8px 13px;border-radius:3px;border:1px solid ${BORDER};font-size:12px;font-weight:500;color:${TEXT_MUTED};white-space:nowrap;background:#fff;cursor:pointer`}
          >
            Выйти
          </button>
        </div>
        <PageHeader section={section} />

        <Show when={section() === 'overview'}>
          <KpiStrip items={[{ label: 'Онлайн сейчас', value: String(onlineCount()) }, ...kpiBase()]} />
          <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:16px;margin-top:16px">
            <Donut title="Объявления · статус" items={statusItems()} unit={UNIT.listing} selected={() => sel.status} onToggle={(k) => setSel('status', k)} />
            <Donut title="Объявления · тип сделки" items={dealItems()} unit={UNIT.listing} selected={() => sel.deal} onToggle={(k) => setSel('deal', k)} />
            <Donut title="Объявления · город" items={cityItems()} unit={UNIT.listing} selected={() => sel.city} onToggle={(k) => setSel('city', k)} />
            <Donut
              title="Жалобы · решение"
              items={resolutionItems()}
              unit={UNIT.complaint}
              selected={() => sel.resolution}
              onToggle={(k) => setSel('resolution', k)}
            />
          </section>
        </Show>

        <Show when={section() === 'listings'}>
          <KpiStrip items={kpiBase()} />
          <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:16px;margin-top:16px">
            <Donut title="Объявления · статус" items={statusItems()} unit={UNIT.listing} selected={() => sel.status} onToggle={(k) => setSel('status', k)} />
            <Donut title="Объявления · тип сделки" items={dealItems()} unit={UNIT.listing} selected={() => sel.deal} onToggle={(k) => setSel('deal', k)} />
            <Donut title="Объявления · город" items={cityItems()} unit={UNIT.listing} selected={() => sel.city} onToggle={(k) => setSel('city', k)} />
          </section>
          <ListingsTable
            rows={data.listings}
            onStatus={setListingStatus}
            onDelete={deleteListing}
            onChat={(ownerId) => {
              setSection('support');
              setFocusSupportUserId(ownerId);
            }}
          />
        </Show>

        <Show when={section() === 'complaints'}>
          {(() => {
            const filters = [
              ['all', 'Все'],
              ['pending', 'На рассмотрении'],
              ['upheld', 'Подтверждено'],
              ['dismissed', 'Отклонено']
            ];
            const visible = () => data.reports.filter((r) => complaintFilter() === 'all' || r.report.status === complaintFilter());
            const selected = () => data.reports.find((r) => r.report.id === selectedComplaintId()) || null;
            return (
              <section style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;align-items:flex-start">
                <div style={`flex:1 1 440px;min-width:0;border:1px solid ${BORDER};border-radius:4px;background:#fff;overflow:hidden`}>
                  <div style={`display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid ${BORDER};background:${SURFACE_ALT}`}>
                    <div style="font-size:13px;font-weight:600">Очередь жалоб</div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      <For each={filters}>
                        {([k, label]) => {
                          const on = () => complaintFilter() === k;
                          return (
                            <button
                              type="button"
                              class="bn-tap"
                              onClick={() => setComplaintFilter(k)}
                              style={`border:1px solid ${on() ? ACCENT : BORDER};background:${on() ? ACCENT : '#fff'};color:${on() ? '#fff' : TEXT};cursor:pointer;font-size:11.5px;padding:3px 9px;border-radius:3px`}
                            >
                              {label}
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                  <Show when={visible().length === 0}>
                    <div style={`padding:26px 18px;font-size:12.5px;color:${TEXT_FAINT}`}>Жалоб нет</div>
                  </Show>
                  <For each={visible()}>
                    {(item) => {
                      const r = RESOLUTION[item.report.status];
                      const isSel = () => item.report.id === selectedComplaintId();
                      return (
                        <button
                          type="button"
                          onClick={() => setSelectedComplaintId(item.report.id)}
                          style={`width:100%;text-align:left;border:0;border-bottom:1px solid ${BORDER_SOFT};border-left:3px solid ${isSel() ? ACCENT : r.accent};background:${isSel() ? ACCENT_ROW : '#fff'};cursor:pointer;padding:12px 16px;display:flex;flex-direction:column;gap:6px`}
                        >
                          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                            <span style={`font-family:${MONO};font-size:11px;color:${TEXT_FAINT}`}>
                              #{item.report.id} · {item.listing ? shortId(item.listing.id) : '—'} · {dateOnly(item.report.createdAt)}
                            </span>
                            <Badge bg={r.bg} fg={r.fg}>
                              {r.label}
                            </Badge>
                          </div>
                          <div style="font-size:13px;line-height:1.4;color:#16171a">{reasonText(item.report.reason)}</div>
                          <div style={`font-size:11.5px;color:${TEXT_MUTED}`}>Пожаловался: {item.reporter?.name || '—'}</div>
                        </button>
                      );
                    }}
                  </For>
                </div>

                <aside style={`flex:1 1 336px;min-width:0;border:1px solid ${BORDER};border-radius:4px;background:#fff;position:sticky;top:20px`}>
                  <Show
                    when={selected()}
                    fallback={<div style={`padding:26px 18px;font-size:12.5px;color:${TEXT_FAINT};line-height:1.5`}>Выберите жалобу слева, чтобы увидеть объявление, автора и принять решение.</div>}
                  >
                    <div style="display:flex;flex-direction:column">
                      <div style={`padding:16px;border-bottom:1px solid ${BORDER};display:flex;flex-direction:column;gap:6px`}>
                        <div style={`font-family:${MONO};font-size:11px;color:${TEXT_FAINT};text-transform:uppercase;letter-spacing:.06em`}>
                          Жалоба
                        </div>
                        <div style="font-size:14.5px;font-weight:600;line-height:1.35">{reasonText(selected().report.reason)}</div>
                      </div>
                      <div style={`padding:14px 16px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid ${BORDER}`}>
                        {[
                          [
                            'Объявление',
                            selected().listing ? `${shortId(selected().listing.id)} · ${DEAL_LABEL[selected().listing.deal]} · ${cityLabel(selected().listing.city)}` : 'Удалено'
                          ],
                          ['Владелец', selected().owner?.name || '—'],
                          ['Пожаловался', selected().reporter?.name || '—'],
                          ['Дата', dateOnly(selected().report.createdAt)],
                          ['Статус объявления', selected().listing ? LISTING_STATUS[selected().listing.status]?.label : '—']
                        ].map(([label, value]) => (
                          <div style="display:grid;grid-template-columns:112px minmax(0,1fr);gap:10px;font-size:12.5px">
                            <span style={`color:${TEXT_FAINT}`}>{label}</span>
                            <span>{value}</span>
                          </div>
                        ))}
                      </div>
                      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px">
                        <div style={`font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}>Решение</div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                          <Show when={selected().report.status === 'pending'}>
                            <ActBtn big variant="primary" onClick={() => resolveReport(selected().report.id, 'uphold')}>
                              Подтвердить
                            </ActBtn>
                            <ActBtn big variant="neutral" onClick={() => resolveReport(selected().report.id, 'dismiss')}>
                              Отклонить
                            </ActBtn>
                          </Show>
                          <ActBtn
                            big
                            variant="neutral"
                            onClick={() => {
                              setSection('support');
                              setFocusSupportUserId(selected().report.reporterId);
                            }}
                          >
                            Написать автору
                          </ActBtn>
                        </div>
                      </div>
                    </div>
                  </Show>
                </aside>
              </section>
            );
          })()}
        </Show>

        <Show when={section() === 'users'}>
          {(() => {
            const q = () => userQuery().trim().toLowerCase();
            const userFilters = () => [
              ['all', 'Все', data.users.length],
              ['unread', 'Непрочитанные', data.users.filter((u) => u.unreadSupport > 0).length],
              ['online', 'Онлайн', data.users.filter((u) => u.online).length],
              ['blocked', 'Заблокированные', data.users.filter((u) => u.status === 'blocked').length],
              ...Object.keys(ROLE_LABEL).map((k) => [k, ROLE_LABEL[k], data.users.filter((u) => u.role === k).length])
            ];
            const matchesFilter = (u) => {
              const f = userFilter();
              if (f === 'all') return true;
              if (f === 'unread') return u.unreadSupport > 0;
              if (f === 'online') return u.online;
              if (f === 'blocked') return u.status === 'blocked';
              return u.role === f;
            };
            const rows = () => data.users.filter((u) => matchesFilter(u) && (!q() || (u.name + u.phone).toLowerCase().includes(q())));
            return (
              <section style="display:flex;gap:16px;flex-wrap:wrap;margin-top:16px;align-items:flex-start">
                <div style={`flex:1 1 400px;min-width:0;border:1px solid ${BORDER};border-radius:4px;background:#fff;overflow:hidden`}>
                  <div style={`padding:12px 16px;border-bottom:1px solid ${BORDER};background:${SURFACE_ALT};display:flex;flex-direction:column;gap:10px`}>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
                      <div style="font-size:13px;font-weight:600">Пользователи</div>
                      <input
                        value={userQuery()}
                        onInput={(e) => setUserQuery(e.currentTarget.value)}
                        placeholder="Поиск по имени, телефону"
                        style={`border:1px solid ${BORDER};border-radius:3px;padding:5px 9px;font-size:12px;width:160px;background:#fff;color:${INK}`}
                      />
                    </div>
                    <div style="display:flex;gap:4px;flex-wrap:wrap">
                      <For each={userFilters()}>
                        {([k, label, count]) => {
                          const on = () => userFilter() === k;
                          return (
                            <button
                              type="button"
                              class="bn-tap"
                              onClick={() => setUserFilter(k)}
                              style={`border:1px solid ${on() ? ACCENT : BORDER};background:${on() ? ACCENT : '#fff'};color:${on() ? '#fff' : TEXT};cursor:pointer;font-size:11.5px;padding:3px 9px;border-radius:3px;white-space:nowrap`}
                            >
                              {label} · {count}
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                  <Show when={rows().length === 0}>
                    <div style={`padding:32px 20px;text-align:center;font-size:13px;color:${TEXT_GHOST}`}>Пользователей нет</div>
                  </Show>
                  <For each={rows()}>{(u) => <UserRow user={u} selectedId={selectedUserId()} onSelect={selectUser} />}</For>
                </div>

                <aside style={`flex:1 1 360px;min-width:0;border:1px solid ${BORDER};border-radius:4px;background:#fff`}>
                  <UserDetail
                    detail={userDetail()}
                    draft={userDraft()}
                    onDraft={setUserDraft}
                    onSave={saveUser}
                    onChat={() => {
                      setSection('support');
                      setFocusSupportUserId(selectedUserId());
                    }}
                    onListingStatus={setListingStatus}
                    onDeleteRequest={setConfirmDeleteUser}
                  />
                </aside>
              </section>
            );
          })()}
        </Show>

        <Show when={section() === 'agencies'}>
          {(() => {
            const agencies = () => data.users.filter((u) => u.role === 'agency');
            const statsOf = (id) => {
              const items = data.listings.filter((it) => it.listing.ownerId === id).map((it) => it.listing);
              return {
                total: items.length,
                active: items.filter((l) => l.status === 'active').length,
                flagged: items.filter((l) => l.status === 'flagged').length,
                archived: items.filter((l) => l.status === 'archived' || l.status === 'rented').length
              };
            };
            return (
              <section style={`border:1px solid ${BORDER};border-radius:4px;background:#fff;margin-top:16px;overflow-x:auto`}>
                <div style="min-width:760px">
                  <div
                    style={`display:grid;grid-template-columns:minmax(0,1fr) 150px 90px 90px 90px 110px 140px;gap:12px;padding:10px 16px;border-bottom:1px solid ${BORDER};background:${SURFACE_ALT};font-family:${MONO};font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:${TEXT_FAINT}`}
                  >
                    <div>Агентство</div>
                    <div>Телефон</div>
                    <div>Всего</div>
                    <div>Активно</div>
                    <div>Жалобы</div>
                    <div>Статус</div>
                    <div>Действие</div>
                  </div>
                  <Show when={agencies().length === 0}>
                    <div style={`padding:32px 20px;text-align:center;font-size:13px;color:${TEXT_GHOST}`}>Агентств нет</div>
                  </Show>
                  <For each={agencies()}>
                    {(u) => (
                      <div
                        style={`display:grid;grid-template-columns:minmax(0,1fr) 150px 90px 90px 90px 110px 140px;gap:12px;padding:11px 16px;border-bottom:1px solid ${BORDER_SOFT};align-items:center;font-size:12.5px`}
                      >
                        <div style="display:flex;align-items:center;gap:7px;min-width:0">
                          <Dot on={u.online} />
                          <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{u.name}</span>
                        </div>
                        <div style={`font-family:${MONO};font-size:11.5px;color:${TEXT_MUTED}`}>{u.phone}</div>
                        <div style={`font-family:${MONO}`}>{statsOf(u.id).total}</div>
                        <div style={`font-family:${MONO};color:${ACCENT}`}>{statsOf(u.id).active}</div>
                        <div style={`font-family:${MONO};color:${statsOf(u.id).flagged ? DANGER : TEXT_GHOST}`}>{statsOf(u.id).flagged}</div>
                        <div>
                          <Badge bg={u.status === 'blocked' ? DANGER_SOFT : ACCENT_SOFT} fg={u.status === 'blocked' ? DANGER : ACCENT}>
                            {u.status === 'blocked' ? 'Заблокирован' : 'Активен'}
                          </Badge>
                        </div>
                        <div>
                          <ActBtn variant="neutral" onClick={() => openUser(u.id)}>
                            Профиль
                          </ActBtn>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </section>
            );
          })()}
        </Show>

        <Show when={section() === 'revisions'}>
          <div style={`border:1px solid ${BORDER};border-radius:4px;background:#fff;margin-top:16px;padding:4px 16px 16px`}>
            <RevisionPanel onUnauthorized={props.onUnauthorized} onCountChange={setRevisionsCount} />
          </div>
        </Show>

        <Show when={section() === 'support'}>
          <SupportPanel
            onUnauthorized={props.onUnauthorized}
            onCountChange={setSupportUnread}
            event={supportEvent}
            users={() => data.users}
            focusUserId={focusSupportUserId}
            onFocusHandled={() => setFocusSupportUserId(null)}
            onOpenUser={openUser}
          />
        </Show>
      </main>

      <Show when={confirmDeleteUser()}>
        <div style={`position:fixed;inset:0;background:${OVERLAY};display:flex;align-items:center;justify-content:center;padding:24px;z-index:40`}>
          <div style="width:100%;max-width:400px;background:#fff;border:1px solid #e3e3e0;border-radius:5px;padding:22px;display:flex;flex-direction:column;gap:14px">
            <div style="font-size:16px;font-weight:600;letter-spacing:-.01em">Удалить аккаунт?</div>
            <div style="font-size:13px;line-height:1.5;color:#4a4c50">
              {confirmDeleteUser().name} будет удалён навсегда. Его объявления уйдут в архив, чат с поддержкой будет стёрт.
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">
              <button
                type="button"
                class="bn-tap"
                onClick={() => setConfirmDeleteUser(null)}
                style="border:1px solid #e3e3e0;background:#fff;color:#4a4c50;cursor:pointer;font-size:12.5px;padding:8px 14px;border-radius:3px"
              >
                Отмена
              </button>
              <button
                type="button"
                class="bn-tap"
                onClick={confirmDelete}
                style="border:1px solid #9a3412;background:#9a3412;color:#fff;cursor:pointer;font-size:12.5px;font-weight:500;padding:8px 14px;border-radius:3px"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      </Show>

      <Show when={toast()}>
        <div style="position:fixed;right:22px;bottom:22px;background:#16171a;color:#fff;font-size:12.5px;padding:10px 15px;border-radius:3px;z-index:50">
          {toast()}
        </div>
      </Show>
    </div>
  );
}

export default function AdminApp() {
  const [ready, setReady] = sig(false);
  const [loggedIn, setLoggedIn] = sig(false);

  onMount(async () => {
    const token = readMigrated(localStorage, TOKEN_KEY, LEGACY_TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    safeSet(localStorage, TOKEN_KEY, token);
    setAuthToken(token);
    try {
      await api.get('/api/admin/users');
      setLoggedIn(true);
    } catch {
      safeRemove(localStorage, TOKEN_KEY);
      safeRemove(localStorage, LEGACY_TOKEN_KEY);
      setAuthToken(null);
    } finally {
      setReady(true);
    }
  });

  const onUnauthorized = () => {
    safeRemove(localStorage, TOKEN_KEY);
    safeRemove(localStorage, LEGACY_TOKEN_KEY);
    setAuthToken(null);
    setLoggedIn(false);
  };

  return (
    <Show when={ready()}>
      <Show when={loggedIn()} fallback={<Login onLogin={() => setLoggedIn(true)} />}>
        <Panel onUnauthorized={onUnauthorized} />
      </Show>
    </Show>
  );
}
