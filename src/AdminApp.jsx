import { createStore } from 'solid-js/store';
import { For, Show, createSignal as sig, createEffect, onMount, onCleanup } from 'solid-js';
import { api, setAuthToken, ApiError } from './api';
import { connectRealtime, disconnectRealtime } from './realtime';
import { readMigrated, safeSet, safeRemove } from './storage';
import { TEAL, TEAL_T, TEAL_TX, RED_T, RED_TX, SOFT, FAINT, MUTED, INK } from './theme';
import Icon from './components/Icon';
import RevisionPanel from './admin/RevisionPanel';
import { addrLine, roomsLabel, priceOf, dateTime, PersonLine } from './admin/adminFormat';

function timeOf(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getHours()) + ':' + p(d.getMinutes());
}

const TOKEN_KEY = 'hayhome.admin.token';
const LEGACY_TOKEN_KEY = 'bnak.admin.token';

function apiErrText(e) {
  if (e instanceof ApiError) {
    if (e.code === 'network') return 'Сервер недоступен, проверьте подключение';
    if (e.code === 'invalid credentials') return 'Неверный логин или пароль';
    return e.code;
  }
  return String((e && e.message) || e);
}

const LISTING_STATUS_LABEL = { pending: 'Первичная модерация', active: 'Сегодня', flagged: 'Жалобы', archived: 'Архив', rented: 'Архив' };

const REASON_LABEL = {
  rs1: 'Сказали, что квартира уже сдана, и предложили другой вариант',
  rs2: 'Никто не отвечает больше суток',
  rs3: 'Цена или условия на месте оказались другими',
  rs4: 'Фото не от этой квартиры'
};
const reasonText = (code) => REASON_LABEL[code] || code || '—';

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
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px">
      <form
        onSubmit={submit}
        style="width:100%;max-width:360px;background:#fff;border-radius:20px;padding:32px;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnIn .2s ease"
      >
        <div style="display:flex;align-items:center;gap:10px">
          <span style="width:40px;height:40px;border-radius:13px;background:#1c1b19;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
            <Icon name="shield" size={19} stroke="#fff" weight={1.8} />
          </span>
          <div>
            <div style="font-size:17px;font-weight:800;letter-spacing:-.02em">Панель управления</div>
            <div style="font-size:12.5px;color:#6f6d68;margin-top:2px">Только для администратора</div>
          </div>
        </div>

        <div style="margin-top:24px;display:flex;flex-direction:column;gap:12px">
          <input
            type="text"
            autocomplete="username"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            placeholder="Логин"
            style="width:100%;padding:13px 16px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:15px"
          />
          <input
            type="password"
            autocomplete="current-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            placeholder="Пароль"
            style="width:100%;padding:13px 16px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:15px"
          />
        </div>

        <Show when={err()}>
          <div style="margin-top:12px;padding:12px 14px;border-radius:12px;background:#fceeeb;color:#93331f;font-size:13px;font-weight:600">
            {err()}
          </div>
        </Show>

        <button
          type="submit"
          disabled={busy()}
          style={`margin-top:16px;width:100%;display:flex;align-items:center;justify-content:center;padding:14px;border-radius:13px;border:none;background:${busy() ? '#9ecbc5' : TEAL};color:#fff;font-size:14.5px;font-weight:700;cursor:${busy() ? 'default' : 'pointer'}`}
        >
          Войти
        </button>
      </form>
    </div>
  );
}

const ROLE_LABEL = { tenant: 'Ищет жильё', owner: 'Сдаёт своё жильё', agency: 'Агентство' };

function Tab(props) {
  return (
    <div
      onClick={props.onClick}
      style={`padding:12px 16px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(28,27,25,.05);background:${props.on ? INK : '#fff'};color:${props.on ? '#fff' : MUTED}`}
    >
      {props.label}
    </div>
  );
}

function Kpi(props) {
  return (
    <div style={`padding:20px;border-radius:16px;box-shadow:0 1px 2px rgba(28,27,25,.05);background:${props.bg || '#fff'}`}>
      <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#6f6d68">{props.label}</div>
      <div style={`font-size:31px;font-weight:800;letter-spacing:-.03em;margin-top:8px;color:${props.fg || INK}`}>{props.value}</div>
    </div>
  );
}

function UserRow(props) {
  const u = () => props.user;

  return (
    <div style="display:grid;grid-template-columns:2fr 1.2fr 1fr;border-bottom:1px solid #f4f3f0;align-items:center">
      <div style="padding:16px 20px;display:flex;align-items:center;gap:10px;min-width:0">
        <span style="width:32px;height:32px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
          {u().ini}
        </span>
        <div style="min-width:0">
          <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{u().name}</div>
          <div style="font-size:11.5px;color:#9a9793;margin-top:2px">{ROLE_LABEL[u().role] || u().role}</div>
        </div>
      </div>
      <div style="padding:16px 20px;font-size:13px;color:#4a4844;font-variant-numeric:tabular-nums">{u().phone}</div>
      <div style="padding:16px 20px;font-size:12.5px;color:#9a9793;font-variant-numeric:tabular-nums">{dateTime(u().createdAt)}</div>
    </div>
  );
}

function ReportRow(props) {
  const r = () => props.item;
  const pending = () => r().report.status === 'pending';
  const statusChip = () =>
    ({
      pending: ['На рассмотрении', SOFT, MUTED],
      dismissed: ['Отклонена', SOFT, FAINT],
      upheld: ['Подтверждена', RED_T, RED_TX]
    })[r().report.status] || [r().report.status, SOFT, MUTED];

  return (
    <div style={`padding:20px;border-radius:16px;box-shadow:0 1px 2px rgba(28,27,25,.05);background:${pending() ? '#fffaf9' : '#fff'}`}>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <span
          style={`display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:${statusChip()[1]};color:${statusChip()[2]}`}
        >
          {statusChip()[0]}
        </span>
        <span style="font-size:12px;color:#9a9793;font-variant-numeric:tabular-nums">
          №{r().report.id} · {dateTime(r().report.createdAt)}
        </span>
      </div>

      <div style="margin-top:14px">
        <Show when={r().listing} fallback={<span style="font-size:13px;color:#9a9793">Объявление удалено</span>}>
          <div style="font-size:15.5px;font-weight:800;letter-spacing:-.01em">
            {roomsLabel(r().listing)}, {r().listing.area} m²
          </div>
          <div style="font-size:13px;color:#6f6d68;margin-top:4px">
            {addrLine(r().listing)} · {priceOf(r().listing)}
          </div>
          <Show when={r().listing.cadastreCode}>
            <div style="font-size:12px;color:#9a9793;margin-top:4px">
              Кадастровый код:{' '}
              <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#4a4844">{r().listing.cadastreCode}</span>
            </div>
          </Show>
        </Show>
      </div>

      <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:16px;padding:14px 16px;border-radius:12px;background:#f7f7f6">
        <PersonLine label="Пожаловался" person={r().reporter} />
        <PersonLine label="Владелец объявления" person={r().owner} />
      </div>

      <div style="margin-top:14px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9a9793">Причина</div>
        <div style="margin-top:4px;font-size:13.5px;font-weight:700;line-height:1.4">{reasonText(r().report.reason)}</div>
        <Show when={r().report.text}>
          <div style="margin-top:6px;font-size:13px;color:#4a4844;line-height:1.5;padding:10px 12px;border-radius:10px;background:#f7f7f6">
            «{r().report.text}»
          </div>
        </Show>
      </div>

      <Show when={pending()}>
        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
          <div
            onClick={() => props.onResolve(r().report.id, 'dismiss')}
            style={`display:inline-flex;align-items:center;padding:11px 14px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;background:${TEAL_T};color:${TEAL_TX};white-space:nowrap`}
          >
            Отклонить — вернуть в выдачу
          </div>
          <div
            onClick={() => props.onResolve(r().report.id, 'uphold')}
            style={`display:inline-flex;align-items:center;padding:11px 14px;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;background:${RED_T};color:${RED_TX};white-space:nowrap`}
          >
            Подтвердить — снять объявление
          </div>
        </div>
      </Show>
    </div>
  );
}

function ListingRow(props) {
  const l = () => props.item.listing;
  const owner = () => props.item.owner || {};
  const st = () => l().status;

  return (
    <div style="display:grid;grid-template-columns:2fr 1.3fr 1.3fr 1fr 1.6fr;border-bottom:1px solid #f4f3f0;align-items:center">
      <div style="padding:16px 20px;min-width:0">
        <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          {roomsLabel(l())}, {l().area} m²
        </div>
        <div style="font-size:12px;color:#6f6d68;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          {addrLine(l())} · {priceOf(l())}
        </div>
      </div>
      <div style="padding:16px 20px;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{owner().name || '—'}</div>
        <div style="font-size:11.5px;color:#9a9793;margin-top:2px">Владелец</div>
      </div>
      <div style="padding:16px 20px;min-width:0">
        <Show when={l().cadastreCode} fallback={<span style="font-size:12.5px;color:#9a9793">не указан</span>}>
          <div style="font-size:12.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            {l().cadastreCode}
          </div>
          <a
            href="https://www.cadastre.am"
            target="_blank"
            rel="noopener noreferrer"
            style="font-size:11.5px;color:#0e7c73;font-weight:700;margin-top:2px;display:inline-block"
          >
            Проверить →
          </a>
        </Show>
      </div>
      <div style="padding:16px 20px">
        <span style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;background:#f2f1ee;color:#6f6d68">
          {LISTING_STATUS_LABEL[st()] || st()}
        </span>
      </div>
      <div style="padding:12px 20px;display:flex;gap:8px;flex-wrap:wrap">
        <Show when={st() === 'pending'}>
          <div
            onClick={() => openPrivateDocument(l().id)}
            style="display:inline-flex;align-items:center;gap:6px;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:#f2f1ee;color:#4a4844;white-space:nowrap"
          >
            <Icon name="doc" size={13} weight={2} />
            Документ
          </div>
        </Show>
        <Show when={st() !== 'active'}>
          <div
            onClick={() => props.onStatus(l().id, 'active')}
            style={`display:inline-flex;align-items:center;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:${TEAL_T};color:${TEAL_TX};white-space:nowrap`}
          >
            Вернуть в выдачу
          </div>
        </Show>
        <Show when={st() === 'active' || st() === 'flagged'}>
          <div
            onClick={() => props.onStatus(l().id, 'archived')}
            style="display:inline-flex;align-items:center;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:#f2f1ee;color:#4a4844;white-space:nowrap"
          >
            Снять с публикации
          </div>
        </Show>
        <div
          onClick={() => props.onDelete(l().id)}
          style={`display:inline-flex;align-items:center;padding:10px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;background:${RED_T};color:${RED_TX};white-space:nowrap`}
        >
          Удалить
        </div>
      </div>
    </div>
  );
}

function SupportMessageBubble(props) {
  const m = () => props.m;
  const mine = () => m().sender === 'admin';
  return (
    <div style={`display:flex;justify-content:${mine() ? 'flex-end' : 'flex-start'}`}>
      <div
        style={`max-width:78%;padding:12px;font-size:14px;line-height:1.5;box-shadow:0 1px 2px rgba(28,27,25,.05);border-radius:${mine() ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};background:${mine() ? TEAL : '#fff'};color:${mine() ? '#fff' : INK}`}
      >
        <div style="padding:0 2px;white-space:pre-wrap;word-break:break-word">{m().text}</div>
        <div style={`font-size:10.5px;margin-top:4px;padding:0 2px;color:${mine() ? 'rgba(255,255,255,.7)' : FAINT}`}>
          {timeOf(m().createdAt)}
        </div>
      </div>
    </div>
  );
}

function SupportPanel(props) {
  const [threads, setThreads] = sig([]);
  const [activeId, setActiveId] = sig(null);
  const [messages, setMessages] = sig([]);
  const [draft, setDraft] = sig('');
  let listRef;

  const loadThreads = async () => {
    try {
      setThreads(await api.get('/api/admin/support/threads'));
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };

  const openThread = async (id) => {
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

  createEffect(() => {
    messages().length;
    if (listRef) listRef.scrollTop = listRef.scrollHeight;
  });

  createEffect(() => {
    const data = props.event();
    if (!data || !data.threadId) return;
    if (data.threadId === activeId()) {
      setMessages((list) => (list.some((m) => m.id === data.message.id) ? list : [...list, data.message]));
    }
    loadThreads();
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

  return (
    <div style="margin-top:16px;display:grid;grid-template-columns:minmax(240px,320px) 1fr;gap:16px;align-items:start">
      <div style="background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden">
        <Show when={threads().length === 0}>
          <div style="padding:32px 20px;text-align:center;font-size:13.5px;color:#9a9793">Обращений нет</div>
        </Show>
        <For each={threads()}>
          {(th) => (
            <div
              onClick={() => openThread(th.threadId)}
              style={`padding:14px 16px;border-bottom:1px solid #f4f3f0;cursor:pointer;display:flex;gap:10px;align-items:center;background:${activeId() === th.threadId ? '#f7f7f6' : 'transparent'}`}
            >
              <span style="width:32px;height:32px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                {th.user.ini || '?'}
              </span>
              <div style="min-width:0;flex:1">
                <div style="font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  {th.user.name || th.user.phone}
                </div>
                <div style="font-size:12px;color:#9a9793;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  {th.lastMessage ? th.lastMessage.text : '—'}
                </div>
              </div>
              <Show when={th.unread > 0}>
                <span style="min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#e5484d;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                  {th.unread}
                </span>
              </Show>
            </div>
          )}
        </For>
      </div>

      <div style="background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05);display:flex;flex-direction:column;height:min(600px,70vh)">
        <Show when={activeId()} fallback={<div style="margin:auto;font-size:13.5px;color:#9a9793">Выберите обращение слева</div>}>
          <div style="padding:16px 20px;border-bottom:1px solid #f4f3f0;font-size:14.5px;font-weight:800">
            {active() ? active().user.name || active().user.phone : ''}
          </div>
          <div ref={listRef} style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:10px">
            <For each={messages()}>{(m) => <SupportMessageBubble m={m} />}</For>
          </div>
          <form onSubmit={send} style="display:flex;gap:10px;padding:14px;border-top:1px solid #f4f3f0">
            <input
              value={draft()}
              onInput={(e) => setDraft(e.currentTarget.value)}
              placeholder="Ответ пользователю…"
              style="flex:1;border:none;background:#f7f7f6;border-radius:12px;padding:12px 16px;font-size:14px;outline:none"
            />
            <button
              type="submit"
              disabled={!draft().trim()}
              style={`padding:0 20px;border-radius:12px;border:none;font-size:13.5px;font-weight:700;cursor:pointer;background:${TEAL};color:#fff;opacity:${draft().trim() ? 1 : 0.4}`}
            >
              Отправить
            </button>
          </form>
        </Show>
      </div>
    </div>
  );
}

function Panel(props) {
  const [tab, setTab] = sig('reports');
  const [data, setData] = createStore({ users: [], reports: [], listings: [] });

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
  const loadAll = () => {
    loadUsers();
    loadReports();
    loadListings();
    loadRevisionsCount();
  };

  onMount(loadAll);

  const resolveReport = async (id, action) => {
    try {
      await api.post('/api/admin/reports/' + id + '/resolve', { action });
      await Promise.all([loadReports(), loadListings()]);
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const setListingStatus = async (id, status) => {
    try {
      await api.post('/api/admin/listings/' + id + '/status', { status });
      await loadListings();
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };
  const deleteListing = async (id) => {
    try {
      await api.del('/api/admin/listings/' + id);
      await Promise.all([loadListings(), loadReports()]);
    } catch (e) {
      if (e.status === 401) props.onUnauthorized();
    }
  };

  const pendingCount = () => data.reports.filter((r) => r.report.status === 'pending').length;
  const [revisionsCount, setRevisionsCount] = sig(0);
  const [supportUnread, setSupportUnread] = sig(0);
  const [supportEvent, setSupportEvent] = sig(null);

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

  return (
    <div style="width:100%;max-width:1400px;margin:0 auto;padding:32px clamp(16px,3vw,28px) 48px;animation:bnIn .2s ease">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="width:44px;height:44px;border-radius:14px;background:#1c1b19;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
          <Icon name="shield" size={20} stroke="#fff" weight={1.8} />
        </span>
        <div style="flex:1">
          <h1 style="margin:0;font-size:clamp(22px,4vw,28px);font-weight:800;letter-spacing:-.03em">Панель администратора</h1>
          <div style="font-size:13.5px;color:#6f6d68;margin-top:2px">Пользователи, жалобы и объявления в одном месте.</div>
        </div>
        <div
          onClick={logout}
          style="padding:12px 16px;border-radius:12px;border:1px solid #e8e7e4;font-size:13.5px;font-weight:700;color:#6f6d68;cursor:pointer;white-space:nowrap"
        >
          Выйти
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:16px;margin-top:24px">
        <Kpi label="Жалобы" value={String(pendingCount())} fg={pendingCount() ? RED_TX : INK} bg={pendingCount() ? RED_T : '#fff'} />
        <Kpi
          label="Правки"
          value={String(revisionsCount())}
          fg={revisionsCount() ? TEAL_TX : INK}
          bg={revisionsCount() ? TEAL_T : '#fff'}
        />
        <Kpi label="Пользователи" value={String(data.users.length)} />
        <Kpi label="Объявления" value={String(data.listings.length)} />
        <Kpi label="Поддержка" value={String(supportUnread())} fg={supportUnread() ? RED_TX : INK} bg={supportUnread() ? RED_T : '#fff'} />
      </div>

      <div style="display:flex;gap:8px;margin-top:24px;flex-wrap:wrap">
        <Tab label="Жалобы" on={tab() === 'reports'} onClick={() => setTab('reports')} />
        <Tab label="Правки" on={tab() === 'revisions'} onClick={() => setTab('revisions')} />
        <Tab label="Пользователи" on={tab() === 'users'} onClick={() => setTab('users')} />
        <Tab label="Объявления" on={tab() === 'listings'} onClick={() => setTab('listings')} />
        <Tab label="Поддержка" on={tab() === 'support'} onClick={() => setTab('support')} />
      </div>

      <Show when={tab() === 'support'}>
        <SupportPanel onUnauthorized={props.onUnauthorized} onCountChange={setSupportUnread} event={supportEvent} />
      </Show>

      <Show when={tab() === 'revisions'}>
        <RevisionPanel onUnauthorized={props.onUnauthorized} onCountChange={setRevisionsCount} />
      </Show>

      <Show when={tab() === 'reports'}>
        <Show when={data.reports.length === 0}>
          <div style="margin-top:16px;background:#fff;border-radius:18px;padding:32px 20px;text-align:center;font-size:13.5px;color:#9a9793;box-shadow:0 1px 2px rgba(28,27,25,.05)">
            Жалоб нет
          </div>
        </Show>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
          <For each={data.reports}>{(item) => <ReportRow item={item} onResolve={resolveReport} />}</For>
        </div>
      </Show>

      <Show when={tab() === 'users'}>
        <div style="margin-top:16px;background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden">
          <div style="overflow-x:auto">
            <div style="min-width:900px">
              <div style="display:grid;grid-template-columns:2fr 1.2fr 1fr;background:#fbfbfa;border-bottom:1px solid #f0efec;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6f6d68;white-space:nowrap">
                <div style="padding:16px 20px">Пользователь</div>
                <div style="padding:16px 20px">Телефон</div>
                <div style="padding:16px 20px">Регистрация</div>
              </div>
              <Show when={data.users.length === 0}>
                <div style="padding:32px 20px;text-align:center;font-size:13.5px;color:#9a9793">Пользователей нет</div>
              </Show>
              <For each={data.users}>{(u) => <UserRow user={u} />}</For>
            </div>
          </div>
        </div>
      </Show>

      <Show when={tab() === 'listings'}>
        <div style="margin-top:16px;background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05);overflow:hidden">
          <div style="overflow-x:auto">
            <div style="min-width:1080px">
              <div style="display:grid;grid-template-columns:2fr 1.3fr 1.3fr 1fr 1.6fr;background:#fbfbfa;border-bottom:1px solid #f0efec;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6f6d68;white-space:nowrap">
                <div style="padding:16px 20px">Объект</div>
                <div style="padding:16px 20px">Владелец</div>
                <div style="padding:16px 20px">Кадастровый код</div>
                <div style="padding:16px 20px">Статус</div>
                <div style="padding:16px 20px">Действие</div>
              </div>
              <Show when={data.listings.length === 0}>
                <div style="padding:32px 20px;text-align:center;font-size:13.5px;color:#9a9793">Объявлений нет</div>
              </Show>
              <For each={data.listings}>{(item) => <ListingRow item={item} onStatus={setListingStatus} onDelete={deleteListing} />}</For>
            </div>
          </div>
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
    <div style="min-height:100vh;background:#f7f7f6">
      <Show when={ready()}>
        <Show when={loggedIn()} fallback={<Login onLogin={() => setLoggedIn(true)} />}>
          <Panel onUnauthorized={onUnauthorized} />
        </Show>
      </Show>
    </div>
  );
}
