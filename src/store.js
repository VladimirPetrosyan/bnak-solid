import { createStore } from 'solid-js/store';
import { createEffect, createRoot } from 'solid-js';
import { CITY, DIST, FEAT, nf } from './data';
import { dict, tr, trN, LI } from './i18n';
import { TEAL, TEAL_T, TEAL_TX, INK, MUTED, FAINT, SOFT, RED, RED_T, RED_TX } from './theme';
import { api, setAuthToken, setApiLang, fileURL, ApiError } from './api';
import { documentFile, clearDocumentFile, buildListingFormData } from './documentUpload';
import { isValidOutcomeSource } from './closeDeal';
import { formatListingDate } from './listingStats';
import { getBrowserId } from './browserId';
import { readMigrated, safeSet, safeGet, safeRemove } from './storage';
import { connectRealtime, disconnectRealtime, watchListing, clearListingWatch } from './realtime';
import { validateExchangeRateSnapshot, isNewerSnapshot, amdToForeign, isSnapshotStale } from './exchangeRates';
import { resolveLegalId, LEGAL_CONSENT_VERSION } from './legalDocs';
import { buildListingPayload } from './postPayload';
import { isValidRepairCondition, repairConditionLabel } from './repairCondition';
import { COUNTRIES, findCountry, findCountryByDigits, groupDigits } from './countries';
import { lastPreviewBody } from './screens/chat/format';
import { playNotifySound } from './screens/chat/notifySound';

const KEY = 'hayhome.state.v2';
const LEGACY_KEY = 'bnak.state.v2';
const AUTH_FLOW_KEY = 'hayhome.authFlow.v1';
const AUTH_FLOW_STEPS = ['login', 'phone', 'code', 'password', 'role', 'forgotPhone', 'reset'];
const AUTH_FLOW_TTL = 10 * 60 * 1000;

function loadAuthFlow() {
  try {
    const raw = safeGet(localStorage, AUTH_FLOW_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    if (!AUTH_FLOW_STEPS.includes(o.step)) return null;
    if (Date.now() - (o.savedAt || 0) > AUTH_FLOW_TTL) return null;
    return o;
  } catch {
    return null;
  }
}

export function isoDay(offset = 0, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const DEFAULTS = {
  stay: { checkIn: isoDay(1), checkOut: isoDay(2), guests: 2 },
  bookings: [],
  lang: 'RU',
  screen: 'search',
  deal: 'rent',
  query: '',
  sort: 'fresh',
  shown: 12,
  strict: true,
  rooms: 'all',
  city: 'yerevan',
  priceMin: '',
  priceMax: '',
  areaMin: '',
  areaMax: '',
  amen: {},
  repair: {},
  owners: true,
  agencies: true,
  fresh: 'f72',
  bbox: null,
  favs: {},
  active: null,
  phoneShown: false,
  filtersOpen: false,
  howOpen: false,
  sortOpen: false,
  reportOn: null,
  reason: null,
  reportSent: false,
  reportText: '',
  flagged: {},
  rented: {},
  user: null,
  token: null,
  auth: {
    step: 'entry',
    country: 'AM',
    phone: '',
    code: '',
    password: '',
    role: 'tenant',
    name: '',
    forgot: false,
    after: null,
    from: null,
    legalAccepted: false,
    busy: false,
    resendAt: 0
  },
  thread: null,
  draft: '',
  threads: null,
  unread: {},
  post: null,
  confirmed: {},
  gallery: null,
  sms: null,
  closeDeal: null,
  signOutConfirmOpen: false,
  cabTab: 'all',
  savedSearches: [],
  toast: null,
  tick: 0,
  loading: false,
  isMob: window.innerWidth < 820,
  remoteListings: [],
  myRemote: [],
  remoteFavorites: [],
  remoteBusy: false,
  tokenWallet: { data: null, loading: false, error: null },
  promoteBusy: {},
  confirmBusy: {},
  realtimeStatus: 'offline',
  support: { messages: [], loading: false },
  exchangeRates: null,
  legalId: null,
  legalFrom: 'search',
  msgNotice: null,
  chatAtBottom: true
};

const PERSIST = [
  'lang',
  'favs',
  'user',
  'token',
  'flagged',
  'rented',
  'confirmed',
  'threads',
  'deal',
  'strict',
  'sort',
  'city',
  'unread',
  'savedSearches'
];

function load() {
  try {
    const raw = readMigrated(localStorage, KEY, LEGACY_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return {};
    if (!CITY[o.city]) delete o.city;
    if (!LI[o.lang]) delete o.lang;
    if (!['rent', 'daily', 'sale', 'newb', 'comm', 'hotel'].includes(o.deal)) delete o.deal;
    if (!['fresh', 'cheap', 'exp', 'score', 'area'].includes(o.sort)) delete o.sort;
    return o;
  } catch {
    return {};
  }
}

export const GUARDED_SCREENS = ['fav', 'chat', 'post', 'cabinet', 'profile'];

function parseRoute(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const [head, id] = parts;
  if (!head) return { screen: 'search' };
  if (head === 'map') return { screen: 'map' };
  if (head === 'favorites') return { screen: 'fav' };
  if (head === 'cabinet') return { screen: 'cabinet' };
  if (head === 'profile') return { screen: 'profile' };
  if (head === 'auth') return { screen: 'auth' };
  if (head === 'post') return { screen: 'post' };
  if (head === 'chat') return { screen: 'chat' };
  if (head === 'listing') return id ? { screen: 'listing', active: decodeURIComponent(id) } : { screen: 'search' };
  if (head === 'legal') {
    return { screen: 'legal', legalId: id ? resolveLegalId(decodeURIComponent(id)) : null, legalFrom: 'search' };
  }
  return { screen: 'search' };
}

function pathFor(s) {
  switch (s.screen) {
    case 'map':
      return '/map';
    case 'fav':
      return '/favorites';
    case 'cabinet':
      return '/cabinet';
    case 'profile':
      return '/profile';
    case 'auth':
      return '/auth';
    case 'post':
      return '/post';
    case 'chat':
      return '/chat';
    case 'listing':
      return s.active ? '/listing/' + encodeURIComponent(s.active) : '/';
    case 'legal':
      return s.legalId ? '/legal/' + encodeURIComponent(s.legalId) : '/legal';
    default:
      return '/';
  }
}

const routeInit = parseRoute(window.location.pathname);
const savedAuthFlow = loadAuthFlow();
const authFlowInit = savedAuthFlow
  ? {
      auth: {
        ...DEFAULTS.auth,
        step: savedAuthFlow.step,
        country: savedAuthFlow.country || DEFAULTS.auth.country,
        phone: savedAuthFlow.phone || '',
        role: savedAuthFlow.role || DEFAULTS.auth.role,
        forgot: !!savedAuthFlow.forgot
      }
    }
  : {};

export const [state, setState] = createStore({ ...DEFAULTS, ...load(), ...routeInit, ...authFlowInit });
setAuthToken(state.token);

createRoot(() => {
  let last = '';
  createEffect(() => {
    const keep = {};
    PERSIST.forEach((k) => {
      keep[k] = state[k];
    });
    const str = JSON.stringify(keep);
    if (str === last) return;
    last = str;
    safeSet(localStorage, KEY, str);
  });

  createEffect(() => {
    const path = pathFor(state);
    if (window.location.pathname === path) return;
    window.history.replaceState(null, '', path);
  });

  let lastAuthFlow = '';
  createEffect(() => {
    const step = state.auth.step;
    if (!AUTH_FLOW_STEPS.includes(step)) {
      if (lastAuthFlow) {
        lastAuthFlow = '';
        safeRemove(localStorage, AUTH_FLOW_KEY);
      }
      return;
    }
    const payload = {
      step,
      country: state.auth.country,
      phone: state.auth.phone,
      role: state.auth.role,
      forgot: state.auth.forgot,
      savedAt: Date.now()
    };
    const str = JSON.stringify(payload);
    if (str === lastAuthFlow) return;
    lastAuthFlow = str;
    safeSet(localStorage, AUTH_FLOW_KEY, str);
  });
});

export const t = () => dict(state.lang);
export const txt = (key, vars) => tr(state.lang, key, vars);
export const txtN = (key, n, vars) => trN(state.lang, key, n, vars);
export const li = () => LI[state.lang] ?? 1;
export const langCode = () => ['hy', 'ru', 'en'][li()];
setApiLang(langCode());

export const cityK = () => (CITY[state.city] ? state.city : 'yerevan');
export const cityObj = () => CITY[cityK()];

const API_ERR_KEYS = {
  'bad json': 'errBadJson',
  'invalid phone': 'errInvalidPhone',
  'sms send failed': 'errSmsFailed',
  'db error': 'errDbError',
  'code not requested': 'errCodeNotRequested',
  'code expired': 'errCodeExpired',
  'wrong code': 'errWrongCode',
  'wrong password': 'errWrongPassword',
  invalid_dates: 'errInvalidDates',
  invalid_guests: 'errInvalidGuests',
  not_available: 'errNotAvailable',
  too_many_guests: 'tooManyGuests',
  cannot_book_own: 'errOwnBooking',
  booking_not_pending: 'errBookingState',
  room_has_bookings: 'errRoomHasBookings',
  invalid_room: 'errInvalidRoom',
  'hotel title and address are required': 'errHotelRequired',
  invalid_stay_kind: 'errStayKind',
  invalid_stay_time: 'errStayTime',
  deal_change_not_allowed: 'errDealChange',
  'invalid password': 'errInvalidPassword',
  'phone not verified': 'errPhoneNotVerified',
  'phone already registered': 'errPhoneTaken',
  'legal not accepted': 'errLegalRequired',
  'legal version outdated': 'errLegalVersion',
  'invalid legal language': 'errLegalLanguage',
  'invalid credentials': 'errInvalidCredentials',
  'account blocked': 'errAccountBlocked',
  'user not found': 'errUserNotFound',
  'not authenticated': 'errNotAuthenticated',
  'not found': 'errNotFound',
  'invalid status': 'errInvalidStatus',
  listing_not_active: 'errListingNotActive',
  invalid_source: 'errInvalidSource',
  vip_active: 'errVipActive',
  tokens_insufficient: 'errTokensInsufficient',
  'street, price and area are required': 'errListingRequired',
  'cadastre certificate code is required': 'errCadastreRequired',
  invalid_repair_condition: 'errRepairCondition',
  'not your listing': 'errNotYourListing',
  'listing not found': 'errListingNotFound',
  'bad multipart form': 'errBadForm',
  'request too large': 'errRequestTooLarge',
  'document missing': 'errDoc',
  'document is empty': 'errDocSize',
  'document too large': 'errDocSize',
  'document type not allowed': 'errDocType',
  "no photo file (field 'photo')": 'errNoPhoto',
  'missing url': 'errMissingUrl',
  "no file (field 'file')": 'errNoFile',
  'save failed': 'errSaveFailed',
  'thread not found': 'errThreadNotFound',
  'not a participant': 'errNotParticipant',
  'cannot message yourself': 'errMessageSelf',
  'empty message': 'errEmptyMessage',
  'message not found': 'errNotFound',
  'not a voice message': 'errNotVoiceMessage',
  transcribe_failed: 'errTranscribeFailed',
  no_changes: 'errNoChanges',
  revision_pending: 'errRevisionPending',
  changes_require_review: 'errChangesRequireReview'
};

function apiErrText(e) {
  if (e instanceof ApiError) {
    if (e.code === 'network') return txt('netErr');
    if (e.code === 'too many requests') return txt('errTooManyRequests', { n: e.retryAfter || 60 });
    const key = API_ERR_KEYS[e.code];
    return key ? txt(key) : e.code;
  }
  return String((e && e.message) || e);
}

function backendStatusToSc(status) {
  if (status === 'flagged') return 'flagged';
  if (status === 'rented' || status === 'archived') return 'archived';
  return 'fresh'; // 'active'
}

function normalizeRemote(item) {
  const l = item.listing;
  const owner = item.owner || {};
  const text = l.street || '';
  const confirmedMs = l.confirmedAt ? new Date(l.confirmedAt).getTime() : Date.now();
  return {
    id: l.id,
    deal: l.deal,
    city: l.city,
    d: l.d || 'kentron',
    st: [text, text, text],
    ll: [l.lat || 0, l.lng || 0],
    price: l.price,
    rooms: l.rooms,
    area: l.area,
    fl: l.fl,
    fls: l.fls,
    sc: backendStatusToSc(l.status),
    ch: Math.max(0, Math.floor((Date.now() - confirmedMs) / 3600000)),
    s: 'u:' + l.ownerId,
    f: l.f || [],
    ph: (l.photos || []).length || 5,
    photos: (l.photos || []).map(fileURL),
    videos: (l.videos || []).map(fileURL),
    desc: l.desc,
    dep: l.dep,
    cadastreCode: l.cadastreCode || '',
    repairCondition: l.repairCondition || '',
    remote: true,
    ownerId: l.ownerId,
    ownerInfo: owner,
    backendStatus: l.status,
    confirmedAt: l.confirmedAt || null,
    expiresAt: l.expiresAt || null,
    updatedAt: l.updatedAt || null,
    promoted: !!l.promoted,
    promotedUntil: l.promotedUntil || null,
    pendingRevision: item.pendingRevision || null,
    createdAt: l.createdAt || null,
    outcome: item.outcome || null,
    views: typeof item.views === 'number' ? item.views : undefined,
    favorites: typeof item.favorites === 'number' ? item.favorites : undefined,
    title: l.title || '',
    stayKind: l.stayKind || '',
    checkIn: l.checkIn || '',
    checkOut: l.checkOut || '',
    stay: item.stay || null
  };
}

function mergeDefinedFields(base, incoming) {
  if (!incoming) return base;
  if (!base) return incoming;
  const result = { ...base };
  Object.keys(incoming).forEach((key) => {
    const value = incoming[key];
    if (value !== null && value !== undefined) result[key] = value;
  });
  return result;
}

function mergeRemoteItem(base, incoming) {
  if (!base) return incoming;
  return {
    ...incoming,
    listing: mergeDefinedFields(base.listing, incoming.listing),
    owner: mergeDefinedFields(base.owner, incoming.owner),
    views: typeof incoming.views === 'number' ? incoming.views : base.views,
    favorites: typeof incoming.favorites === 'number' ? incoming.favorites : base.favorites,
    pendingRevision: incoming.pendingRevision !== undefined ? incoming.pendingRevision : base.pendingRevision,
    outcome: incoming.outcome !== undefined ? incoming.outcome : base.outcome,
    stay: base.stay || incoming.stay
  };
}

function remoteById() {
  const map = {};
  const apply = (list) => {
    list.forEach((it) => {
      const id = it.listing.id;
      map[id] = mergeRemoteItem(map[id], it);
    });
  };
  apply(state.remoteListings);
  apply(state.remoteFavorites);
  apply(state.myRemote);
  return map;
}

export async function loadRemoteListings() {
  const snapshot = statsSnapshot();
  try {
    const stay = state.deal === 'hotel' ? '&' + stayParams() : '';
    const deal = state.deal === 'all' ? '' : 'deal=' + encodeURIComponent(state.deal) + '&';
    const list = await api.get('/api/listings?' + deal + 'city=' + encodeURIComponent(cityK()) + stay);
    setState('remoteListings', applyRemoteReconciliation(list, snapshot));
    syncListingWatch();
  } catch {}
}

export async function loadExchangeRates() {
  try {
    const payload = await api.get('/api/exchange-rates');
    applyExchangeRateSnapshot(payload);
  } catch {}
}

function applyExchangeRateSnapshot(payload) {
  const snapshot = validateExchangeRateSnapshot(payload);
  if (!snapshot || !isNewerSnapshot(snapshot, state.exchangeRates)) return;
  setState('exchangeRates', snapshot);
}

export async function loadMyRemoteListings() {
  if (!state.token) {
    setState('myRemote', []);
    return;
  }
  const snapshot = statsSnapshot();
  try {
    const list = await api.get('/api/listings/mine');
    setState('myRemote', applyRemoteReconciliation(list, snapshot));
  } catch {}
}

export async function loadFavoritesRemote() {
  if (!state.token) return;
  const snapshot = statsSnapshot();
  try {
    const list = await api.get('/api/favorites');
    const reconciled = applyRemoteReconciliation(list, snapshot);
    setState('remoteFavorites', reconciled);
    setState('favs', (f) => {
      const next = { ...f };
      reconciled.forEach((it) => {
        next[it.listing.id] = true;
      });
      return next;
    });
  } catch {}
}

export async function refreshTokenWallet() {
  if (!state.token) {
    setState('tokenWallet', { data: null, loading: false, error: null });
    return;
  }
  const requestToken = state.token;
  setState('tokenWallet', { loading: true, error: null });
  try {
    const data = await api.get('/api/tokens');
    if (state.token !== requestToken) return;
    setState('tokenWallet', { data, loading: false, error: null });
  } catch (e) {
    if (state.token !== requestToken) return;
    setState('tokenWallet', { loading: false, error: apiErrText(e) });
  }
}

export async function activateVip(id) {
  if (state.promoteBusy[id]) return;
  setState('promoteBusy', id, true);
  try {
    await api.post('/api/listings/' + id + '/promote');
    await Promise.all([refreshTokenWallet(), loadMyRemoteListings(), loadRemoteListings()]);
    say(txt('vipActivatedToast'));
  } catch (e) {
    say(apiErrText(e));
  } finally {
    setState('promoteBusy', id, false);
  }
}

export function allListings() {
  return Object.values(remoteById()).map(normalizeRemote);
}

export const byId = (id) => allListings().find((l) => l.id === id);

export async function refreshListingDetail(id) {
  const snapshot = statsSnapshot();
  try {
    const item = await api.get('/api/listings/' + id + '?' + stayParams(), { 'X-Browser-Id': getBrowserId() });
    const [reconciled] = applyRemoteReconciliation([item], snapshot);
    setState('remoteListings', (list) => {
      const i = list.findIndex((x) => x.listing.id === id);
      if (i === -1) return list.concat([reconciled]);
      const next = list.slice();
      next[i] = reconciled;
      return next;
    });
  } catch {}
}

export function sellerOf(l) {
  const o = l.ownerInfo || {};
  const name = o.name || 'HayHome';
  return {
    n: [name, name, name],
    t: sellerKind(o.role),
    since: 2026,
    score: 100,
    comp: 0,
    conf: [1, 1],
    ini: o.ini || '?',
    ph: o.phone ? formatPhone(o.phone) : ''
  };
}

const sellerKind = (role) => (role === 'agency' || role === 'hotel' ? role : 'owner');

export const sellerRoleLabel = (sel) => txt({ owner: 'ownerW', agency: 'agencyW', hotel: 'hotelW' }[sel.t]);

export function statusOf(l) {
  if (state.rented[l.id]) return 'archived';
  if (state.flagged[l.id]) return 'flagged';
  if (state.confirmed[l.id]) return 'fresh';
  return l.sc;
}

export const hoursOf = (l) => (state.confirmed[l.id] ? 0 : l.ch);

export function addrOf(l) {
  const i = li();
  if (l.city !== 'yerevan') return CITY[l.city].n[i] + ', ' + l.st[i];
  return (DIST[l.d] || DIST.center)[i] + ', ' + l.st[i];
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function distanceToCenterOf(l) {
  const center = CITY[l.city] && CITY[l.city].ll;
  if (!center || !Array.isArray(l.ll) || (l.ll[0] === 0 && l.ll[1] === 0)) return '';
  const meters = haversineMeters(center, l.ll);
  if (!Number.isFinite(meters)) return '';
  const km = meters / 1000;
  const value = km < 1 ? Math.round(meters) + ' ' + txt('mUnit') : (km < 10 ? km.toFixed(1) : Math.round(km)) + ' ' + txt('kmUnit');
  return txt('distFromCenter', { x: value });
}

export function agoOf(l) {
  const h = hoursOf(l);
  if (h < 1) return txt('hAgo', { n: 1 });
  if (h < 24) return txt('hAgo', { n: h });
  return txt('dAgo', { n: Math.round(h / 24) });
}

export const priceOf = (l) => nf(l.price) + ' ֏';

export function usdOf(l) {
  const snap = state.exchangeRates;
  const usd = snap && amdToForeign(l.price, snap.usd);
  return Number.isFinite(usd) ? '≈ $' + nf(usd) : '';
}

export function rubOf(l) {
  const snap = state.exchangeRates;
  const rub = snap && amdToForeign(l.price, snap.rub);
  return Number.isFinite(rub) ? '≈ ₽' + nf(rub) : '';
}

export function exchangeRateDateLabel() {
  const snap = state.exchangeRates;
  if (!snap) return '';
  const formatted = formatListingDate(snap.publishedAt, state.lang);
  return formatted ? txt('rateDateLabel', { x: formatted }) : '';
}

export function exchangeRateIsStale() {
  return isSnapshotStale(state.exchangeRates);
}

export function perOf(l) {
  if (l.deal === 'hotel') return txt('perNight');
  if (l.deal === 'daily') return txt('perDay');
  if (l.deal === 'sale' || l.deal === 'newb') return '';
  return txt('perMonth');
}

export function roomsLabel(l) {
  if (l.deal === 'hotel') return stayKindLabel(l.stayKind);
  if (l.deal === 'comm') return ['տարածք', 'помещение', 'space'][li()];
  if (l.rooms === 0) return txt('studio');
  return txt('roomsN', { n: l.rooms });
}

export const metaOf = (l) =>
  (l.f || [])
    .slice(0, 3)
    .map((f) => (FEAT[f] || ['', '', ''])[li()])
    .join(' · ');

export const repairLabelOf = (l) => repairConditionLabel(l.repairCondition, li()) || txt('repairUnspecified');

export function shortPrice(l) {
  const big = ['մլն', 'млн', 'M'][li()];
  const small = ['հզ', 'к', 'k'][li()];
  if (l.price >= 1000000) return Math.round(l.price / 100000) / 10 + ' ' + big + ' ֏';
  return Math.round(l.price / 1000) + ' ' + small + ' ֏';
}

export function clock(seconds) {
  const left = Math.max(0, seconds - state.tick);
  const p = (n) => String(Math.floor(n)).padStart(2, '0');
  return p(left / 3600) + ':' + p((left % 3600) / 60) + ':' + p(left % 60);
}

export function visible() {
  const q = (state.query || '').trim().toLowerCase();
  const out = allListings().filter((l) => {
    if (state.deal !== 'all' && l.deal !== state.deal) return false;
    if (l.city !== cityK()) return false;
    const st = statusOf(l);
    if (state.strict && (st === 'due' || st === 'flagged' || st === 'archived')) return false;
    if (st === 'archived') return false;
    if (state.fresh === 'f24' && hoursOf(l) >= 24) return false;
    if (state.fresh === 'f48' && hoursOf(l) >= 48) return false;
    const hotel = l.deal === 'hotel';
    if (hotel && state.deal === 'hotel' && !(l.stay && l.stay.bookable)) return false;
    if (!hotel && state.rooms !== 'all') {
      if (state.rooms === 'studio' && l.rooms !== 0) return false;
      if (state.rooms === '3' && l.rooms < 3) return false;
      if (state.rooms !== 'studio' && state.rooms !== '3' && l.rooms !== parseInt(state.rooms, 10)) return false;
    }
    const pmin = parseInt(String(state.priceMin).replace(/\s/g, ''), 10);
    const pmax = parseInt(String(state.priceMax).replace(/\s/g, ''), 10);
    if (!isNaN(pmin) && l.price < pmin) return false;
    if (!isNaN(pmax) && l.price > pmax) return false;
    const amin = parseInt(state.areaMin, 10);
    const amax = parseInt(state.areaMax, 10);
    if (!hotel && !isNaN(amin) && l.area < amin) return false;
    if (!hotel && !isNaN(amax) && l.area > amax) return false;
    if (state.bbox) {
      const b = state.bbox;
      if (l.ll[0] < b[0] || l.ll[0] > b[2] || l.ll[1] < b[1] || l.ll[1] > b[3]) return false;
    }
    const sel = sellerOf(l);
    if (!state.owners && sel.t === 'owner') return false;
    if (!state.agencies && sel.t === 'agency') return false;
    const on = Object.keys(state.amen).filter((k) => state.amen[k]);
    if (on.length && !on.every((k) => (l.f || []).includes(k))) return false;
    const repairOn = Object.keys(state.repair).filter((k) => state.repair[k]);
    if (repairOn.length && !repairOn.includes(l.repairCondition)) return false;
    if (q) {
      const hay = (addrOf(l) + ' ' + l.title + ' ' + l.st.join(' ') + ' ' + (DIST[l.d] || []).join(' ') + ' ' + sel.n.join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  const cmp = {
    fresh: (a, b) => hoursOf(a) - hoursOf(b),
    cheap: (a, b) => a.price - b.price,
    exp: (a, b) => b.price - a.price,
    score: (a, b) => sellerOf(b).score - sellerOf(a).score,
    area: (a, b) => b.area - a.area
  }[state.sort];
  return out.sort(cmp || (() => 0));
}

export function cardOf(l) {
  const st = statusOf(l);
  const sel = sellerOf(l);
  const fav = !!state.favs[l.id];
  const low = sel.score < 80;
  const warm = st === 'due' || st === 'flagged';
  const shortKey = { fresh: 'shFresh', aging: 'shAging', due: 'shDue', flagged: 'shFlag', archived: 'shArch' }[st];
  return {
    id: l.id,
    listing: l,
    slot: 'ph-' + l.id,
    photo: (l.photos && l.photos[0]) || null,
    price: priceOf(l),
    per: perOf(l),
    alt: usdOf(l),
    photosLabel: txt('photosN', { n: l.ph }),
    addr: addrOf(l),
    meta: metaOf(l),
    title: l.deal === 'hotel' ? l.title : roomsLabel(l) + ', ' + l.area + ' m²',
    tags:
      l.deal === 'hotel'
        ? [roomsLabel(l), (DIST[l.d] || DIST.center)[li()], distanceToCenterOf(l)].filter(Boolean)
        : [roomsLabel(l), l.area + ' m²', txt('floorN', { a: l.fl, b: l.fls }), (DIST[l.d] || DIST.center)[li()], distanceToCenterOf(l)].filter(
            Boolean
          ),
    chipBg: warm ? RED_T : st === 'archived' ? '#eeedea' : 'rgba(255,255,255,.94)',
    chipFg: warm ? RED_TX : st === 'fresh' ? TEAL_TX : MUTED,
    chipDot: warm ? RED : st === 'fresh' ? TEAL : '#c9c7c2',
    chipAnim: st === 'fresh' ? 'bnPulse 2.4s infinite' : warm ? 'bnPulse 1.2s infinite' : 'none',
    chipShort: txt(shortKey || 'shFresh'),
    chipText:
      st === 'fresh' || st === 'aging'
        ? txt('stToday', { x: agoOf(l) })
        : st === 'due'
          ? txt('stDue')
          : st === 'flagged'
            ? txt('stFlag')
            : txt('stArch'),
    status: st,
    fav,
    initials: sel.ini,
    avBg: sel.t === 'owner' ? TEAL_T : SOFT,
    avFg: sel.t === 'owner' ? TEAL_TX : MUTED,
    sellerLine: sel.n[li()] + ' · ' + sellerRoleLabel(sel),
    scoreFg: low ? RED_TX : MUTED,
    scoreText: txt('honesty') + ' ' + sel.score + '% · ' + sel.comp + ' ' + txt('complaintsW'),
    warn: st === 'flagged' || low,
    warnText: st === 'flagged' ? txt('warnFlag', { n: Math.max(1, sel.comp) }) : txt('warnScore', { n: 100 - sel.score })
  };
}

let toastTimer;
export function say(msg) {
  clearTimeout(toastTimer);
  setState('toast', msg);
  toastTimer = setTimeout(() => setState('toast', null), 3600);
}

let msgNoticeTimer;
let msgNoticeSeq = 0;
function notifyIncomingMessage(key, message, other) {
  playNotifySound();
  clearTimeout(msgNoticeTimer);
  setState('msgNotice', {
    id: ++msgNoticeSeq,
    key,
    name: (other && other.name) || 'HayHome',
    ini: (other && other.ini) || '💬',
    text: lastPreviewBody(message, t())
  });
  msgNoticeTimer = setTimeout(() => setState('msgNotice', null), 5000);
}

export function dismissMsgNotice() {
  clearTimeout(msgNoticeTimer);
  setState('msgNotice', null);
}

export function openMsgNotice(key) {
  dismissMsgNotice();
  openThread(key);
  go('chat');
}

function syncListingWatch() {
  const l = state.screen === 'listing' ? byId(state.active) : null;
  if (l && l.remote) watchListing(l.id);
  else clearListingWatch();
}

export function go(screen) {
  const wasListing = state.screen === 'listing';
  setState({ screen, phoneShown: false, sortOpen: false });
  if (wasListing || screen === 'listing') syncListingWatch();
  window.scrollTo(0, 0);
}

let loadTimer;
export function reload() {
  clearTimeout(loadTimer);
  setState({ loading: true, shown: 12 });
  loadTimer = setTimeout(() => setState('loading', false), 420);
  loadRemoteListings();
}

export function requireAuth(after) {
  if (state.user) return true;
  const from = state.screen === 'auth' ? state.auth.from : state.screen;
  setState({
    auth: { ...state.auth, step: 'entry', code: '', password: '', forgot: false, after: after || null, from, legalAccepted: false, busy: false },
    screen: 'auth'
  });
  return false;
}

export function exitAuth() {
  const from = state.auth.from && state.auth.from !== 'auth' ? state.auth.from : 'search';
  setState('auth', { step: 'entry', code: '', password: '', forgot: false, after: null, from: null, legalAccepted: false, busy: false });
  go(from);
}

export function startRegistration() {
  setState('auth', (a) => ({ ...a, step: 'phone', code: '', password: '', legalAccepted: false }));
}

export function openLegal(id) {
  const from = state.screen === 'legal' ? state.legalFrom : state.screen;
  setState({ legalFrom: from, legalId: resolveLegalId(id) });
  go('legal');
}

export function legalBack() {
  if (state.legalId) {
    setState('legalId', null);
    return;
  }
  go(state.legalFrom || 'search');
}

export function openListing(id) {
  setState({ active: id, phoneShown: false, gallery: null });
  go('listing');
  const l = byId(id);
  if (l && l.remote) refreshListingDetail(id);
}

const statsGen = {};
const statsCache = {};

function statsSnapshot() {
  return { ...statsGen };
}

function reconcileStats(list, snapshot) {
  return list.map((item) => {
    const id = item.listing.id;
    if ((statsGen[id] || 0) === (snapshot[id] || 0)) return item;
    return { ...item, ...statsCache[id] };
  });
}

const KNOWN_LISTING_STATUSES = new Set(['pending', 'active', 'flagged', 'archived', 'rented']);
const stateCache = {};

function isValidDateStr(v) {
  return typeof v === 'string' && !isNaN(new Date(v).getTime());
}

function isValidNullableDateStr(v) {
  return v === null || v === undefined || isValidDateStr(v);
}

function parseTimeOrNaN(v) {
  if (!v) return NaN;
  const t = new Date(v).getTime();
  return isNaN(t) ? NaN : t;
}

function newestKnownState(id) {
  const cached = stateCache[id];
  let best = cached ? { ...cached, time: parseTimeOrNaN(cached.updatedAt) } : null;
  for (const list of [state.remoteListings, state.myRemote, state.remoteFavorites]) {
    const item = list.find((x) => x.listing.id === id);
    if (!item) continue;
    const time = parseTimeOrNaN(item.listing.updatedAt);
    if (isNaN(time)) continue;
    if (!best || time > best.time) {
      best = {
        status: item.listing.status,
        confirmedAt: item.listing.confirmedAt || null,
        expiresAt: item.listing.expiresAt || null,
        updatedAt: item.listing.updatedAt,
        time
      };
    }
  }
  return best;
}

function resetStateCache() {
  Object.keys(stateCache).forEach((id) => delete stateCache[id]);
}

function reconcileState(list) {
  return list.map((item) => {
    const id = item.listing.id;
    const incoming = parseTimeOrNaN(item.listing.updatedAt);
    const known = newestKnownState(id);
    if (known && (isNaN(incoming) || incoming <= known.time)) {
      return {
        ...item,
        listing: {
          ...item.listing,
          status: known.status,
          confirmedAt: known.confirmedAt,
          expiresAt: known.expiresAt,
          updatedAt: known.updatedAt
        }
      };
    }
    stateCache[id] = {
      status: item.listing.status,
      confirmedAt: item.listing.confirmedAt || null,
      expiresAt: item.listing.expiresAt || null,
      updatedAt: item.listing.updatedAt
    };
    return item;
  });
}

function applyRemoteReconciliation(list, snapshot) {
  return reconcileState(reconcileStats(list, snapshot));
}

function applyListingStatePatch(data) {
  if (!data || typeof data.listingId !== 'string' || !data.listingId) return;
  if (typeof data.status !== 'string' || !KNOWN_LISTING_STATUSES.has(data.status)) return;
  if (!isValidDateStr(data.updatedAt)) return;
  if (!isValidNullableDateStr(data.confirmedAt) || !isValidNullableDateStr(data.expiresAt)) return;

  const id = data.listingId;
  const incoming = parseTimeOrNaN(data.updatedAt);
  const known = newestKnownState(id);
  if (known && incoming <= known.time) return;

  const patch = {
    status: data.status,
    confirmedAt: data.confirmedAt || null,
    expiresAt: data.expiresAt || null,
    updatedAt: data.updatedAt
  };
  stateCache[id] = patch;

  const apply = (list) => {
    const i = list.findIndex((x) => x.listing.id === id);
    if (i === -1) return list;
    const next = list.slice();
    next[i] = { ...next[i], listing: { ...next[i].listing, ...patch } };
    return next;
  };
  setState('remoteListings', apply);
  setState('myRemote', apply);
  setState('remoteFavorites', apply);
}

function applyListingStatsPatch(data) {
  if (!data || typeof data.listingId !== 'string') return;
  const patch = {};
  if (typeof data.views === 'number' && data.views >= 0) patch.views = data.views;
  if (typeof data.favorites === 'number' && data.favorites >= 0) patch.favorites = data.favorites;
  if (!Object.keys(patch).length) return;
  const id = data.listingId;
  statsCache[id] = { ...statsCache[id], ...patch };
  statsGen[id] = (statsGen[id] || 0) + 1;
  const apply = (list) => {
    const i = list.findIndex((x) => x.listing.id === id);
    if (i === -1) return list;
    const next = list.slice();
    next[i] = { ...next[i], ...patch };
    return next;
  };
  setState('remoteListings', apply);
  setState('myRemote', apply);
  setState('remoteFavorites', apply);
}

const favPending = new Set();

export async function toggleFav(id) {
  if (!requireAuth({ type: 'fav', id })) return;
  if (!byId(id)) return;
  const had = !!state.favs[id];
  if (favPending.has(id)) return;
  favPending.add(id);
  try {
    const resp = await (had ? api.del('/api/favorites/' + id) : api.post('/api/favorites/' + id));
    setState('favs', id, had ? undefined : true);
    applyListingStatsPatch({ listingId: id, favorites: resp.favorites });
    say(had ? txt('favRemoved') : txt('favAdded'));
  } catch (e) {
    say(apiErrText(e));
  } finally {
    favPending.delete(id);
  }
}

export function setLang(code) {
  setState('lang', code);
  setApiLang(langCode());
  say(txt('langToast', { x: code }));
  // переводимый текст (описания объявлений, сообщения чата) приходит с сервера уже на
  // нужном языке — при смене языка перезапрашиваем то, что сейчас на экране, чтобы не
  // ждать следующей навигации
  loadRemoteListings();
  if (state.screen === 'listing' && state.active) refreshListingDetail(state.active);
  if (state.thread && state.thread !== SUPPORT_KEY) {
    const th = threadsAll()[state.thread];
    if (th && th.remote) loadThreadMessages(state.thread, th.listing, th.other);
  }
}

export function toggleStrict() {
  const next = !state.strict;
  setState('strict', next);
  reload();
  say(next ? txt('strictOn') : txt('strictOff'));
}

export function activeFilterCount() {
  return (
    (state.rooms !== 'all' ? 1 : 0) +
    Object.keys(state.amen).filter((k) => state.amen[k]).length +
    Object.keys(state.repair).filter((k) => state.repair[k]).length +
    (state.priceMin || state.priceMax ? 1 : 0) +
    (state.areaMin || state.areaMax ? 1 : 0) +
    (state.owners && state.agencies ? 0 : 1) +
    (state.fresh !== 'f72' ? 1 : 0)
  );
}

export function resetFilters() {
  setState({
    deal: 'all',
    rooms: 'all',
    amen: {},
    repair: {},
    priceMin: '',
    priceMax: '',
    areaMin: '',
    areaMax: '',
    owners: true,
    agencies: true,
    fresh: 'f72',
    strict: true,
    query: '',
    filtersOpen: false,
    bbox: null
  });
  reload();
  say(txt('filtersReset'));
}

export function openReport(id) {
  if (!requireAuth({ type: 'report', id })) return;
  setState({ reportOn: id, reason: null, reportSent: false, reportText: '' });
}

export async function submitReport() {
  if (!state.reason) {
    say(txt('reportPick'));
    return;
  }
  const id = state.reportOn;
  const l = byId(id);
  if (l && l.remote) {
    try {
      await api.post('/api/listings/' + id + '/report', { reason: state.reason, text: state.reportText || '' });
      setState('reportSent', true);
      refreshListingDetail(id);
    } catch (e) {
      say(apiErrText(e));
    }
    return;
  }
  setState('flagged', id, true);
  setState('reportSent', true);
}

export { COUNTRIES };

function authPhone(a) {
  return '+' + findCountry(a.country).cc + ' ' + a.phone;
}

function formatPhone(raw) {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  const c = findCountryByDigits(d);
  if (!c) return '+' + d;
  return '+' + c.cc + ' ' + groupDigits(d.slice(c.cc.length));
}

function normalizeUser(u) {
  return u ? { ...u, phone: formatPhone(u.phone) } : u;
}

function applySession(resp) {
  setAuthToken(resp.token);
  setState({ token: resp.token, user: normalizeUser(resp.user) });
}

function afterLogin() {
  loadMyRemoteListings();
  loadFavoritesRemote();
  loadThreadsRemote();
  loadSupportMessages();
  refreshTokenWallet();
  loadBookings();
  connectRealtime({ onMessage: handleRealtimeEvent, onStatus: (s) => setState('realtimeStatus', s) });
  syncListingWatch();
}

function handleRealtimeEvent(type, data) {
  if (type === 'chat.message') receiveRealtimeMessage(data);
  else if (type === 'chat.read') receiveRealtimeRead(data);
  else if (type === 'listing.stats') applyListingStatsPatch(data);
  else if (type === 'listing.state') applyListingStatePatch(data);
  else if (type === 'exchange_rates.updated') applyExchangeRateSnapshot(data);
  else if (type === 'support.message') receiveSupportMessage(data);
}

function supportUnreadCountFrom(messages) {
  return messages.filter((m) => m.sender === 'admin' && !m.readAt).length;
}

export function receiveSupportMessage(data) {
  const message = data && data.message;
  if (!message) return;
  setState('support', 'messages', (msgs) => (msgs.some((m) => m.id === message.id) ? msgs : [...msgs, message]));
  if (message.sender === 'user') return;
  if (state.screen === 'chat' && state.thread === SUPPORT_KEY && state.chatAtBottom !== false) {
    markThreadSeen(SUPPORT_KEY);
    return;
  }
  setState('unread', SUPPORT_KEY, (n) => unreadCountOf(n) + 1);
  notifyIncomingMessage(SUPPORT_KEY, message, { name: t().supportW, ini: '🎧' });
}

export async function loadSupportMessages() {
  setState('support', { loading: true });
  try {
    const messages = await api.get('/api/support/messages');
    setState('support', { messages, loading: false });
    if (!pendingMarkRead.has(SUPPORT_KEY)) {
      const count = supportUnreadCountFrom(messages);
      if (count > 0) setState('unread', SUPPORT_KEY, count);
      else clearUnreadLocal(SUPPORT_KEY);
    }
  } catch {
    setState('support', { loading: false });
  }
}

let pendingSupportSeq = 0;

function addPendingSupportMessage(msg) {
  const id = 'pending-' + ++pendingSupportSeq;
  setState('support', 'messages', (msgs) => [
    ...msgs,
    { sender: 'user', pending: true, createdAt: new Date().toISOString(), ...msg, id }
  ]);
  return id;
}

function removePendingSupportMessage(id) {
  setState('support', 'messages', (msgs) => msgs.filter((m) => m.id !== id));
}

async function persistSupportMessage(pendingId, payload) {
  try {
    const message = await api.post('/api/support/messages', payload);
    removePendingSupportMessage(pendingId);
    setState('support', 'messages', (msgs) => [...msgs, message]);
  } catch (e) {
    removePendingSupportMessage(pendingId);
    say(apiErrText(e));
  }
}

export async function sendSupportMessage(text) {
  const value = text.trim();
  if (!value) return;
  const pendingId = addPendingSupportMessage({ kind: 'text', text: value });
  await persistSupportMessage(pendingId, { kind: 'text', text: value });
}

export async function sendSupportMedia(kind, blobUrl, extra) {
  const pendingId = addPendingSupportMessage({ kind, url: blobUrl, ...extra });
  try {
    const url = await uploadBlob(blobUrl, extra && extra.name);
    await persistSupportMessage(pendingId, { kind, url, ...extra });
  } catch (e) {
    removePendingSupportMessage(pendingId);
    say(apiErrText(e));
  }
}

export async function sendSupportLocation(lat, lng) {
  const pendingId = addPendingSupportMessage({ kind: 'location', lat, lng });
  await persistSupportMessage(pendingId, { kind: 'location', lat, lng });
}

export async function restoreSession() {
  const authRestore = state.token
    ? api.get('/api/me').then(
        (me) => {
          setState('user', normalizeUser(me));
          afterLogin();
        },
        () => {
          disconnectRealtime();
          setAuthToken(null);
          setState({ user: null, token: null, realtimeStatus: 'offline' });
        }
      )
    : Promise.resolve();
  const detail = state.screen === 'listing' && state.active ? refreshListingDetail(state.active) : null;
  await Promise.all([authRestore, loadRemoteListings(), loadExchangeRates(), detail]);

  if (GUARDED_SCREENS.includes(state.screen) && !state.user) {
    requireAuth({ type: 'go', to: state.screen });
  } else if (state.screen === 'auth' && state.user) {
    setState('auth', { ...DEFAULTS.auth });
    go(state.user.role === 'tenant' ? 'search' : 'cabinet');
  }
}

function afterAuthDone() {
  const a = state.auth;
  const after = a.after;
  setState({
    auth: { ...a, step: 'entry', phone: '', code: '', password: '', forgot: false, after: null, legalAccepted: false, busy: false },
    screen: state.user.role === 'tenant' ? 'search' : 'cabinet'
  });
  say(txt('welcomeToast', { n: state.user.name }));
  afterLogin();
  if (!after) return;
  if (after.type === 'go') go(after.to);
  else if (after.type === 'fav') toggleFav(after.id);
  else if (after.type === 'chat') openThreadFor(after.id);
  else if (after.type === 'phone') {
    setState({ active: after.id, phoneShown: true });
    go('listing');
    const l = byId(after.id);
    if (l && l.remote) refreshListingDetail(after.id);
  } else if (after.type === 'report') {
    setState({ active: after.id, reportOn: after.id, reason: null, reportSent: false, reportText: '' });
    go('listing');
    const l = byId(after.id);
    if (l && l.remote) refreshListingDetail(after.id);
  }
}

const RESEND_COOLDOWN_MS = 60_000;

function markCodeJustSent() {
  setState('auth', 'resendAt', Date.now() + RESEND_COOLDOWN_MS);
}

function handleSendCodeErr(e) {
  if (e instanceof ApiError && e.code === 'too many requests') {
    setState('auth', 'resendAt', Date.now() + (e.retryAfter || 60) * 1000);
  }
  say(apiErrText(e));
}

export async function startAuth() {
  const a = state.auth;
  try {
    const resp = await api.post('/api/auth/start', { phone: authPhone(a) });
    setState('auth', 'step', resp.exists ? 'login' : 'code');
    if (!resp.exists) markCodeJustSent();
  } catch (e) {
    handleSendCodeErr(e);
  }
}

export async function requestCode() {
  const a = state.auth;
  if (Date.now() < (a.resendAt || 0)) return;
  try {
    await api.post('/api/auth/request-code', { phone: authPhone(a) });
    markCodeJustSent();
  } catch (e) {
    handleSendCodeErr(e);
  }
}

export async function verifyCode() {
  const a = state.auth;
  try {
    await api.post('/api/auth/verify-code', { phone: authPhone(a), code: a.code });
    setState('auth', 'step', a.forgot ? 'reset' : 'password');
  } catch (e) {
    say(apiErrText(e));
  }
}

export function choosePassword() {
  setState('auth', 'step', 'role');
}

export async function finishAuth() {
  const a = state.auth;
  if (a.busy) return;
  if (!a.legalAccepted) {
    say(txt('errLegalRequired'));
    return;
  }
  const name = (a.name || '').trim() || (a.role === 'agency' ? 'Yerevan Home' : t().namePh);
  setState('auth', 'busy', true);
  try {
    const resp = await api.post('/api/auth/register', {
      phone: authPhone(a),
      password: a.password,
      name,
      role: a.role,
      acceptedLegal: true,
      legalVersion: LEGAL_CONSENT_VERSION,
      legalLanguage: langCode()
    });
    applySession(resp);
    afterAuthDone();
  } catch (e) {
    setState('auth', 'busy', false);
    say(apiErrText(e));
  }
}

export async function loginWithPassword() {
  const a = state.auth;
  try {
    const resp = await api.post('/api/auth/login', { phone: authPhone(a), password: a.password });
    applySession(resp);
    afterAuthDone();
  } catch (e) {
    say(apiErrText(e));
  }
}

export async function forgotPassword() {
  const a = state.auth;
  try {
    await api.post('/api/auth/request-code', { phone: authPhone(a) });
    setState('auth', { step: 'code', code: '', password: '', forgot: true });
    markCodeJustSent();
  } catch (e) {
    handleSendCodeErr(e);
  }
}

export async function resetPassword() {
  const a = state.auth;
  try {
    const resp = await api.post('/api/auth/reset-password', { phone: authPhone(a), password: a.password });
    applySession(resp);
    afterAuthDone();
  } catch (e) {
    say(apiErrText(e));
  }
}

async function attempt(run, toast) {
  try {
    await run();
    say(txt(toast));
    return true;
  } catch (e) {
    say(apiErrText(e));
    return false;
  }
}

export function updateName(name) {
  return attempt(async () => {
    const resp = await api.put('/api/me', { name, role: state.user.role });
    setState('user', { name: resp.name, ini: resp.ini });
  }, 'nameSavedToast');
}

export async function sendPhoneChangeCode(phone) {
  try {
    const resp = await api.post('/api/auth/start', { phone });
    if (resp.exists) say(txt('errPhoneTaken'));
    return !resp.exists;
  } catch (e) {
    say(apiErrText(e));
    return false;
  }
}

export function changePhone(phone, code) {
  return attempt(async () => {
    await api.post('/api/auth/verify-code', { phone, code });
    const resp = await api.put('/api/me/phone', { phone });
    setState('user', 'phone', formatPhone(resp.phone));
  }, 'phoneSavedToast');
}

export function changePassword(current, password) {
  return attempt(() => api.put('/api/me/password', { current, password }), 'pwSavedToast');
}

export function askSignOutConfirm() {
  setState('signOutConfirmOpen', true);
}

export function cancelSignOutConfirm() {
  setState('signOutConfirmOpen', false);
}

export function confirmSignOut() {
  setState('signOutConfirmOpen', false);
  signOut();
}

export function signOut() {
  api.post('/api/auth/logout').catch(() => {});
  disconnectRealtime();
  setAuthToken(null);
  resetStateCache();
  setState({
    user: null,
    token: null,
    screen: 'search',
    post: null,
    myRemote: [],
    remoteFavorites: [],
    bookings: [],
    tokenWallet: { data: null, loading: false, error: null },
    realtimeStatus: 'offline',
    auth: { ...DEFAULTS.auth }
  });
  say(txt('signOutToast'));
}

export const SUPPORT_KEY = 'support';

function mapSupportMsg(m) {
  return {
    id: m.id,
    me: m.sender === 'user',
    pending: m.pending,
    kind: m.kind && m.kind !== 'text' ? m.kind : undefined,
    text: m.text,
    url: fileURL(m.url),
    name: m.name,
    size: m.size,
    dur: m.dur,
    lat: m.lat,
    lng: m.lng,
    time: m.createdAt ? clockOf(m.createdAt) : '',
    date: m.createdAt ? dateOf(m.createdAt) : '',
    readAt: m.readAt || null,
    waveform: m.waveform,
    transcript: m.transcript
  };
}

function supportThread() {
  return {
    remote: true,
    support: true,
    listing: null,
    other: { id: SUPPORT_KEY, name: txt('supportW'), role: 'support', ini: '🎧' },
    msgs: state.support.messages.map(mapSupportMsg)
  };
}

export function threadsAll() {
  const base = state.threads || {};
  if (!state.user) return base;
  return { [SUPPORT_KEY]: supportThread(), ...base };
}

export function chatSellerOf(thread) {
  const o = thread.other || {};
  const name = o.name || 'HayHome';
  return {
    n: [name, name, name],
    t: sellerKind(o.role),
    since: 2026,
    score: 100,
    comp: 0,
    conf: [1, 1],
    ini: o.ini || '?',
    ph: ''
  };
}

function clockOf(iso) {
  const d = new Date(iso);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function dateOf(iso) {
  const d = new Date(iso);
  return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
}

function mapRemoteMsg(m) {
  return {
    id: m.id,
    me: !!(state.user && m.senderId === state.user.id),
    kind: m.kind && m.kind !== 'text' ? m.kind : undefined,
    text: m.text,
    url: fileURL(m.url),
    name: m.name,
    size: m.size,
    dur: m.dur,
    lat: m.lat,
    lng: m.lng,
    booking: m.booking || null,
    time: m.createdAt ? clockOf(m.createdAt) : '',
    date: m.createdAt ? dateOf(m.createdAt) : '',
    readAt: m.readAt || null,
    waveform: m.waveform,
    transcript: m.transcript
  };
}

// Открытие треда больше не сбрасывает unread сразу — счётчик обнуляется только когда
// UI (Chat.jsx) подтвердит, что пользователь реально долистал до последних сообщений,
// см. markThreadSeen/setChatAtBottom. chatAtBottom сбрасываем в false, пока это не
// подтверждено, чтобы realtime-сообщение, пришедшее в этот же момент, не считалось
// прочитанным раньше времени.
export function openThread(key) {
  setState({ thread: key, chatAtBottom: false });
  if (key === SUPPORT_KEY) {
    loadSupportMessages();
    return;
  }
  const th = threadsAll()[key];
  if (th && th.remote) loadThreadMessages(key, th.listing, th.other);
}

function sortableId(id) {
  return Number.isInteger(id) && id > 0 ? id : Infinity;
}

function mergeMessages(existing, incoming) {
  const byId = new Map((existing || []).map((m) => [m.id, m]));
  const bookings = {};
  incoming.forEach((m) => {
    if (m && Number.isInteger(m.id) && m.id > 0) byId.set(m.id, mapRemoteMsg(m));
    if (m && m.booking) bookings[m.booking.id] = m.booking;
  });
  return [...byId.values()]
    .map((m) => (m.booking && bookings[m.booking.id] ? { ...m, booking: bookings[m.booking.id] } : m))
    .sort((a, b) => sortableId(a.id) - sortableId(b.id));
}

export async function loadThreadMessages(threadId, listingId, other) {
  try {
    const msgs = await api.get('/api/threads/' + threadId + '/messages');
    setState('threads', (th) => {
      const cur = (th || {})[threadId] || {};
      return {
        ...(th || {}),
        [threadId]: {
          remote: true,
          listing: listingId || cur.listing,
          other: other || cur.other,
          msgs: mergeMessages(cur.msgs, msgs)
        }
      };
    });
  } catch {}
}

export async function loadThreadsRemote() {
  if (!state.token) return;
  try {
    const list = await api.get('/api/threads');
    setState('threads', (th) => {
      const next = { ...(th || {}) };
      list.forEach((item) => {
        const id = item.thread.id;
        const existing = next[id];
        next[id] = {
          remote: true,
          listing: item.listingId,
          other: item.other,
          msgs: (existing && existing.msgs) || (item.lastMessage ? [mapRemoteMsg(item.lastMessage)] : [])
        };
      });
      return next;
    });
    setState('unread', (u) => {
      const next = { ...u };
      list.forEach((item) => {
        const id = item.thread.id;
        // Не затираем оптимистичный локальный "прочитано", пока подтверждение (POST /read)
        // ещё в полёте — иначе более медленный ответ этого GET может вернуть unread badge
        // на тред, который пользователь уже реально дочитал (race condition, см. п.14).
        if (pendingMarkRead.has(id)) return;
        // Solid-стор при setState('unread', fn) мёрджит возвращаемый объект с текущим —
        // просто пропущенный ключ (delete next[id]) не удаляется, нужно явно next[id] = undefined.
        next[id] = item.unread > 0 ? item.unread : undefined;
      });
      return next;
    });
  } catch {}
}

export function unreadCountOf(value) {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

// Верхний badge — число диалогов с непрочитанными сообщениями, а не сумма сообщений
// по всем диалогам (10 сообщений от одного собеседника — это 1 непрочитанный диалог).
export function unreadTotal() {
  return Object.values(state.unread).filter((v) => unreadCountOf(v) > 0).length;
}

// Сообщается из Chat.jsx: находится ли пользователь сейчас внизу открытого треда
// (видит последнее сообщение). Используется, чтобы решить, увеличивать ли unread на
// входящее realtime-сообщение, или сразу считать его прочитанным.
export function setChatAtBottom(atBottom) {
  setState('chatAtBottom', atBottom);
}

// Solid-стор не удаляет ключ, если его просто нет в объекте, возвращённом из
// setState('unread', fn) — нужен путь до конкретного ключа с явным undefined.
function clearUnreadLocal(key) {
  if (key in state.unread) setState('unread', key, undefined);
}

const markReadTimers = new Map();
const MARK_READ_DEBOUNCE_MS = 250;
// Треды, для которых подтверждение "прочитано" уже принято локально, но POST /read ещё
// не завершился — пока ключ здесь, loadThreadsRemote/loadSupportMessages не должны
// перезаписывать их unread ответом, который мог быть сформирован backend'ом до этого POST.
const pendingMarkRead = new Set();

function persistMarkRead(key) {
  const req = key === SUPPORT_KEY ? api.post('/api/support/read') : api.post('/api/threads/' + key + '/read');
  return req.catch(() => {}).finally(() => pendingMarkRead.delete(key));
}

// Не шлём POST /read на каждое websocket-сообщение — если подряд прилетает пачка
// сообщений (или пользователь быстро листает несколько тредов), запросы схлопываются
// в один через debounce на threadId.
function scheduleMarkRead(key) {
  pendingMarkRead.add(key);
  clearTimeout(markReadTimers.get(key));
  const timer = setTimeout(() => {
    markReadTimers.delete(key);
    persistMarkRead(key);
  }, MARK_READ_DEBOUNCE_MS);
  markReadTimers.set(key, timer);
}

// Единственное место, которое действительно "прочитывает" тред: локально чистит badge
// сразу (оптимистично) и с debounce уведомляет backend. Вызывать только когда точно
// известно, что пользователь видит последние сообщения треда (см. Chat.jsx bottom-detection).
export function markThreadSeen(key) {
  if (!key) return;
  clearUnreadLocal(key);
  scheduleMarkRead(key);
}

export async function openThreadFor(listingId) {
  if (!requireAuth({ type: 'chat', id: listingId })) return;
  const l = byId(listingId);
  if (!l) {
    say(txt('errListingNotFound'));
    return;
  }
  try {
    const resp = await api.post('/api/threads', { listingId });
    const o = l.ownerInfo || {};
    await loadThreadMessages(resp.threadId, listingId, { id: l.ownerId, name: o.name, role: o.role, ini: o.ini });
    setState({ thread: resp.threadId, chatAtBottom: false });
    go('chat');
  } catch (e) {
    say(apiErrText(e));
  }
}

function activeThreadKey() {
  const all = threadsAll();
  return all[state.thread] ? state.thread : Object.keys(all)[0];
}

function isRemoteThread(key) {
  const th = threadsAll()[key];
  return !!(th && th.remote);
}

function mergeIncomingMessages(threadId, rawMessages) {
  let added = false;
  setState('threads', threadId, 'msgs', (msgs) => {
    const merged = mergeMessages(msgs, rawMessages);
    added = merged.length !== (msgs || []).length;
    return merged;
  });
  return added;
}

export function receiveRealtimeMessage(payload) {
  const { message, threadId } = payload || {};
  if (!message || !threadId) return;
  const cur = threadsAll()[threadId];
  if (!cur || !cur.remote) {
    loadThreadsRemote();
    return;
  }
  if (message.booking) applyBookings([message.booking]);
  if (!mergeIncomingMessages(threadId, [message])) return;
  const mine = !!(state.user && message.senderId === state.user.id);
  if (mine) return;
  if (state.screen === 'chat' && state.thread === threadId && state.chatAtBottom !== false) {
    markThreadSeen(threadId);
  } else {
    setState('unread', threadId, (n) => unreadCountOf(n) + 1);
    notifyIncomingMessage(threadId, message, cur.other);
  }
}

export function receiveRealtimeRead(payload) {
  const { threadId, readerId, readAt } = payload || {};
  if (!threadId || !state.user || readerId === state.user.id) return;
  const th = threadsAll()[threadId];
  if (!th || !th.remote) return;
  setState('threads', threadId, 'msgs', (msgs) =>
    (msgs || []).map((m) => (m.me && !m.readAt ? { ...m, readAt: readAt || new Date().toISOString() } : m))
  );
}

let pendingMsgSeq = 0;

function addPendingMessage(threadId, msg) {
  const id = 'pending-' + ++pendingMsgSeq;
  const now = new Date().toISOString();
  setState('threads', threadId, 'msgs', (msgs) => [
    ...(msgs || []),
    { me: true, pending: true, time: clockOf(now), date: dateOf(now), ...msg, id }
  ]);
  return id;
}

function removePendingMessage(threadId, id) {
  setState('threads', threadId, 'msgs', (msgs) => (msgs || []).filter((m) => m.id !== id));
}

async function persistMessage(threadId, pendingId, payload) {
  try {
    const msg = await api.post('/api/threads/' + threadId + '/messages', payload);
    removePendingMessage(threadId, pendingId);
    mergeIncomingMessages(threadId, [msg]);
  } catch (e) {
    removePendingMessage(threadId, pendingId);
    say(apiErrText(e));
  }
}

async function sendRemote(threadId, payload) {
  const pendingId = addPendingMessage(threadId, payload);
  await persistMessage(threadId, pendingId, payload);
}

async function uploadBlob(blobUrl, filename) {
  const blob = await fetch(blobUrl).then((r) => r.blob());
  const form = new FormData();
  form.append('file', blob, filename || 'upload');
  const resp = await api.upload('/api/uploads', form);
  return resp.url;
}

async function sendRemoteMedia(threadId, kind, blobUrl, extra) {
  const pendingId = addPendingMessage(threadId, { kind, url: blobUrl, ...extra });
  try {
    const url = await uploadBlob(blobUrl, extra && extra.name);
    await persistMessage(threadId, pendingId, { kind, url, ...extra });
  } catch (e) {
    removePendingMessage(threadId, pendingId);
    say(apiErrText(e));
  }
}

export function sendMsg() {
  const key = activeThreadKey();
  const text = (state.draft || '').trim();
  if (!text) {
    say(txt('typeSomething'));
    return;
  }
  setState('draft', '');
  if (key === SUPPORT_KEY) {
    sendSupportMessage(text);
    return;
  }
  if (isRemoteThread(key)) sendRemote(key, { kind: 'text', text });
}

export function sendAudioMsg(url, dur, waveform) {
  const key = activeThreadKey();
  const wf = waveform && waveform.length ? JSON.stringify(waveform.map((v) => Math.round(v * 100))) : '';
  if (key === SUPPORT_KEY) {
    sendSupportMedia('audio', url, { dur, waveform: wf });
    return;
  }
  if (isRemoteThread(key)) sendRemoteMedia(key, 'audio', url, { dur, waveform: wf });
}

export async function transcribeAudioMessage(id) {
  const key = activeThreadKey();
  try {
    if (key === SUPPORT_KEY) {
      const { transcript } = await api.post('/api/support/messages/' + id + '/transcript');
      setState('support', 'messages', (msgs) => msgs.map((m) => (m.id === id ? { ...m, transcript } : m)));
      return transcript;
    }
    if (isRemoteThread(key)) {
      const { transcript } = await api.post('/api/threads/' + key + '/messages/' + id + '/transcript');
      setState('threads', key, 'msgs', (msgs) => msgs.map((m) => (m.id === id ? { ...m, transcript } : m)));
      return transcript;
    }
  } catch (e) {
    say(apiErrText(e));
    throw e;
  }
}

export function sendVideoMsg(url) {
  const key = activeThreadKey();
  if (key === SUPPORT_KEY) {
    sendSupportMedia('video', url, {});
    return;
  }
  if (isRemoteThread(key)) sendRemoteMedia(key, 'video', url, {});
}

export function sendImageMsg(url) {
  const key = activeThreadKey();
  if (key === SUPPORT_KEY) {
    sendSupportMedia('image', url, {});
    return;
  }
  if (isRemoteThread(key)) sendRemoteMedia(key, 'image', url, {});
}

export function sendFileMsg(url, name, size) {
  const key = activeThreadKey();
  if (key === SUPPORT_KEY) {
    sendSupportMedia('file', url, { name, size });
    return;
  }
  if (isRemoteThread(key)) sendRemoteMedia(key, 'file', url, { name, size });
}

export function sendLocationMsg(lat, lng) {
  const key = activeThreadKey();
  if (key === SUPPORT_KEY) {
    sendSupportLocation(lat, lng);
    return;
  }
  if (isRemoteThread(key)) sendRemote(key, { kind: 'location', lat, lng });
}

export function myItems() {
  const u = state.user;
  if (!u) return [];
  const merged = remoteById();
  return state.myRemote.map((it) => normalizeRemote(merged[it.listing.id] || it));
}

export function postState() {
  const u = state.user || {};
  return (
    state.post || {
      step: 1,
      editId: null,
      deal: u.role === 'hotel' ? 'hotel' : 'rent',
      title: '',
      stayKind: 'hotel',
      checkInTime: '14:00',
      checkOutTime: '12:00',
      city: 'yerevan',
      dist: 'kentron',
      street: '',
      phone: (u.phone || '').replace('+374 ', ''),
      rooms: 2,
      area: '',
      fl: '',
      fls: '',
      feats: { furn: true },
      repair: '',
      desc: '',
      price: '',
      dep: '1',
      cadastreCode: '',
      photos: 0,
      channel: 'sms',
      doc: false,
      agree: false
    }
  );
}

export const setPost = (patch) => setState('post', { ...postState(), ...patch });

export async function publishListing(photoFiles = [], videoFiles = []) {
  const p = postState();
  const body = buildListingPayload(p);
  const c = CITY[p.city].ll;
  body.lat = c[0] + (Math.random() - 0.5) * 0.03;
  body.lng = c[1] + (Math.random() - 0.5) * 0.04;

  setState('remoteBusy', true);
  try {
    let id = p.editId;
    if (p.editId) {
      const resp = await api.put('/api/listings/' + p.editId, body);
      say(resp.reviewStatus === 'pending' ? txt('editReviewToast') : txt('editedToast'));
    } else {
      const file = documentFile();
      if (!file) {
        say(txt('errDoc'));
        return;
      }
      const resp = await api.upload('/api/listings', buildListingFormData(body, file));
      id = resp.listing.id;
      clearDocumentFile();
      say(txt('publishedToast'));
      for (const file of photoFiles) {
        if (!file) continue;
        const form = new FormData();
        form.append('photo', file);
        try {
          await api.upload('/api/listings/' + id + '/photos', form);
        } catch {}
      }
      for (const file of videoFiles) {
        if (!file) continue;
        const form = new FormData();
        form.append('video', file);
        try {
          await api.upload('/api/listings/' + id + '/videos', form);
        } catch {}
      }
    }
    setState({ post: null, sms: null, screen: 'cabinet' });
    await Promise.all([loadMyRemoteListings(), loadRemoteListings(), refreshTokenWallet()]);
  } catch (e) {
    say(apiErrText(e));
  } finally {
    setState('remoteBusy', false);
  }
}

export function editListing(id) {
  const l = byId(id);
  if (!l) return;
  if (l.pendingRevision) {
    say(txt('editDisabledPending'));
    return;
  }
  const feats = {};
  (l.f || []).forEach((f) => {
    feats[f] = true;
  });
  clearDocumentFile();
  setState({
    post: {
      ...postState(),
      step: 1,
      editId: id,
      deal: l.deal,
      title: l.title,
      stayKind: l.stayKind || 'hotel',
      checkInTime: l.checkIn,
      checkOutTime: l.checkOut,
      city: l.city,
      dist: l.d,
      street: l.st[li()],
      rooms: l.rooms,
      area: String(l.area),
      fl: String(l.fl),
      fls: String(l.fls),
      feats,
      repair: isValidRepairCondition(l.repairCondition) ? l.repairCondition : '',
      desc: l.desc || '',
      price: String(l.price),
      cadastreCode: l.cadastreCode || '',
      photos: l.ph,
      doc: true
    },
    screen: 'post'
  });
  window.scrollTo(0, 0);
}

export function markRented(id) {
  const l = byId(id);
  if (!l) return;
  setState('closeDeal', { id, source: null, busy: false });
}

export function closeDealSource(source) {
  if (state.closeDeal && !state.closeDeal.busy) setState('closeDeal', 'source', source);
}

export function cancelCloseDeal() {
  if (state.closeDeal && state.closeDeal.busy) return;
  setState('closeDeal', null);
}

export async function confirmCloseDeal() {
  const cd = state.closeDeal;
  if (!cd || cd.busy || !isValidOutcomeSource(cd.source)) return;
  const l = byId(cd.id);
  if (!l) return;
  if (l.remote) {
    setState('closeDeal', 'busy', true);
    try {
      await api.post('/api/listings/' + cd.id + '/mark-taken', { source: cd.source });
      await Promise.all([loadMyRemoteListings(), loadRemoteListings(), refreshTokenWallet()]);
    } catch (e) {
      setState('closeDeal', 'busy', false);
      say(apiErrText(e));
      return;
    }
  } else {
    setState('rented', cd.id, true);
  }
  setState('closeDeal', null);
  say(txt('rentedToast'));
}

export async function returnToFeed(id) {
  const l = byId(id);
  if (l && l.remote) {
    try {
      await api.post('/api/listings/' + id + '/return-to-feed');
      loadMyRemoteListings();
      loadRemoteListings();
    } catch (e) {
      say(apiErrText(e));
      return;
    }
  } else {
    setState('rented', (r) => {
      const next = { ...r };
      delete next[id];
      return next;
    });
    setState('confirmed', id, true);
  }
  say(txt('returnedToast'));
}

export function confirmBySms(id) {
  const l = byId(id);
  if (l && l.remote) {
    confirmRemote(id);
    return;
  }
  setState('sms', { kind: 'listing', id, code: '' });
}

export async function confirmRemote(id) {
  if (state.confirmBusy[id]) return;
  setState('confirmBusy', id, true);
  try {
    const l = byId(id);
    const path = l && statusOf(l) === 'flagged' ? '/resolve' : '/confirm';
    await api.post('/api/listings/' + id + path);
    await loadMyRemoteListings();
    const fresh = byId(id);
    say(txt('smsDone', { x: fresh ? cardOf(fresh).title : '' }));
  } catch (e) {
    say(apiErrText(e));
  } finally {
    setState('confirmBusy', id, false);
  }
}

export function submitSms() {
  const m = state.sms;
  if (!m || (m.code || '').length !== 4) {
    say(txt('codeErr'));
    return;
  }
  if (m.kind === 'publish') {
    publishListing();
    return;
  }
  const l = byId(m.id);
  setState('confirmed', m.id, true);
  setState('flagged', (f) => {
    const next = { ...f };
    delete next[m.id];
    return next;
  });
  setState('sms', null);
  say(txt('smsDone', { x: l ? roomsLabel(l) + ', ' + l.area + ' m²' : '' }));
}

export async function confirmAll() {
  const next = { ...state.confirmed };
  const remoteIds = [];
  myItems().forEach((l) => {
    const st = statusOf(l);
    if (st === 'archived' || st === 'flagged') return;
    if (l.remote) remoteIds.push(l.id);
    else next[l.id] = true;
  });
  setState('confirmed', next);
  await Promise.all(remoteIds.map((id) => api.post('/api/listings/' + id + '/confirm').catch(() => {})));
  if (remoteIds.length) loadMyRemoteListings();
  say(txt('allConfirmed'));
}

export function saveSearch() {
  const titleKey = { rent: 'titleRent', daily: 'titleDaily', sale: 'titleSale', newb: 'titleNew', comm: 'titleComm', hotel: 'titleHotel', all: 'titleAll' }[state.deal];
  const label =
    t()[titleKey] +
    ' · ' +
    cityObj().n[li()] +
    (state.rooms !== 'all' ? ' · ' + state.rooms : '') +
    (state.priceMax ? ' · ≤ ' + nf(+state.priceMax) + ' ֏' : '');
  setState(
    'savedSearches',
    state.savedSearches.concat([{ label, deal: state.deal, city: cityK(), rooms: state.rooms, priceMax: state.priceMax }])
  );
  say(txt('savedToast'));
}

export const STAY_KINDS = ['hotel', 'hostel', 'guesthouse'];

export const dateLocale = () => ['hy-AM', 'ru-RU', 'en-GB'][li()];

export function stayDatesLabel(checkIn, checkOut) {
  const fmt = new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'short' });
  return fmt.format(new Date(checkIn + 'T00:00')) + ' – ' + fmt.format(new Date(checkOut + 'T00:00'));
}

export const bookingStatusLabel = (status) =>
  txt({ pending: 'bkPending', confirmed: 'bkConfirmed', declined: 'bkDeclined', cancelled: 'bkCancelled' }[status] || 'bkPending');

export const stayKindLabel = (kind) => txt({ hotel: 'kindHotel', hostel: 'kindHostel', guesthouse: 'kindGuesthouse' }[kind] || 'kindHotel');

export function stayNightsCount() {
  const { checkIn, checkOut } = state.stay;
  return Math.max(0, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000));
}

function stayParams() {
  const { checkIn, checkOut, guests } = state.stay;
  return 'checkIn=' + checkIn + '&checkOut=' + checkOut + '&guests=' + guests;
}

export function setStay(patch) {
  const next = { ...state.stay, ...patch };
  const today = isoDay();
  if (next.checkIn < today) next.checkIn = today;
  if (next.checkOut <= next.checkIn) next.checkOut = isoDay(1, new Date(next.checkIn + 'T00:00'));
  if (next.checkOut > isoDay(30, new Date(next.checkIn + 'T00:00'))) next.checkOut = isoDay(30, new Date(next.checkIn + 'T00:00'));
  next.guests = Math.min(50, Math.max(1, next.guests));
  setState('stay', next);
  reload();
  if (state.screen === 'listing' && state.active) refreshListingDetail(state.active);
}

export function hotelPriceOf(l) {
  const s = l.stay;
  const nightly = (s && s.minNightly) || l.price;
  if (s && s.minTotal) {
    return { main: nf(s.minTotal) + ' ֏', per: txtN('forNights', s.nights), sub: txt('fromPerNight', { x: nf(nightly) }) };
  }
  return { main: txt('fromPerNight', { x: nf(nightly) }), per: '', sub: '' };
}

export function dailyPriceOf(l) {
  const nights = Math.max(1, stayNightsCount());
  return { main: nf(l.price * nights) + ' ֏', per: txtN('forNights', nights), sub: txt('perDayPrice', { x: nf(l.price) }) };
}

async function attemptApi(run, toast) {
  try {
    const out = await run();
    if (toast) say(txt(toast));
    return out ?? true;
  } catch (e) {
    say(apiErrText(e));
    return null;
  }
}

export const fetchRooms = (listingId) => api.get('/api/listings/' + listingId + '/rooms').catch(() => null);

export function saveRoom(listingId, room) {
  const body = {
    name: room.name,
    capacity: +room.capacity || 0,
    quantity: +room.quantity || 0,
    price: parseInt(String(room.price).replace(/\s/g, ''), 10) || 0,
    bathroom: room.bathroom,
    breakfast: !!room.breakfast
  };
  const path = '/api/listings/' + listingId + '/rooms' + (room.id ? '/' + room.id : '');
  return attemptApi(async () => {
    const saved = await (room.id ? api.put(path, body) : api.post(path, body));
    loadMyRemoteListings();
    return saved;
  }, 'roomSavedToast');
}

export function removeRoom(listingId, roomId) {
  return attemptApi(async () => {
    await api.del('/api/listings/' + listingId + '/rooms/' + roomId);
    loadMyRemoteListings();
  }, 'roomDeletedToast');
}

export const fetchCalendar = (listingId, roomId, month) =>
  api.get('/api/listings/' + listingId + '/rooms/' + roomId + '/calendar?month=' + month).catch((e) => {
    say(apiErrText(e));
    return null;
  });

export const setClosures = (listingId, roomId, days, closed) =>
  attemptApi(
    () => api.put('/api/listings/' + listingId + '/rooms/' + roomId + '/closures', { days, closed }),
    closed ? 'datesClosedToast' : 'datesOpenedToast'
  );

function applyBookings(list) {
  setState('bookings', (current) => {
    const next = current.slice();
    list.forEach((b) => {
      const i = next.findIndex((x) => x.id === b.id);
      if (i === -1) next.unshift(b);
      else next[i] = b;
    });
    return next;
  });
}

export async function loadBookings() {
  if (!state.token) return;
  try {
    setState('bookings', await api.get('/api/bookings'));
  } catch {}
}

export async function requestBooking(listingId, roomTypeId) {
  if (!requireAuth({ type: 'go', to: 'listing' })) return;
  const { checkIn, checkOut, guests } = state.stay;
  const resp = await attemptApi(() => api.post('/api/listings/' + listingId + '/bookings', { roomTypeId, checkIn, checkOut, guests }), 'bookingSentToast');
  if (!resp) return;
  applyBookings([resp.booking]);
  const l = byId(listingId);
  const o = (l && l.ownerInfo) || {};
  await loadThreadMessages(resp.threadId, listingId, { id: resp.booking.ownerId, name: o.name, role: o.role, ini: o.ini });
  setState('thread', resp.threadId);
  go('chat');
}

async function changeBooking(id, path, body, toast) {
  const b = await attemptApi(() => api.post('/api/bookings/' + id + path, body), toast);
  if (!b) return;
  applyBookings([b]);
  refreshListingDetail(b.listingId);
}

export const decideBooking = (id, status) =>
  changeBooking(id, '/decision', { status }, status === 'confirmed' ? 'bookingConfirmedToast' : 'bookingDeclinedToast');

export const cancelBooking = (id) => changeBooking(id, '/cancel', undefined, 'bookingCancelledToast');

export async function openBookingChat(b) {
  if (!threadsAll()[b.threadId]) await loadThreadsRemote();
  openThread(b.threadId);
  go('chat');
}

export { INK, MUTED, FAINT, SOFT, TEAL, TEAL_T, TEAL_TX, RED, RED_T, RED_TX };
