import { api, API_BASE } from './api';

const BASE_BACKOFF = 1000;
const MAX_BACKOFF = 30000;

let ws = null;
let socketGen = 0;
let attempt = 0;
let backoffTimer = null;
let closedByUser = true;
let handlers = { onMessage: () => {}, onStatus: () => {} };
let listenersReady = false;
let desiredListingId = null;
let hasDesiredListing = false;
let socketReady = false;
let ticketPath = '/api/realtime/ticket';

function wsURL(ticket) {
  return API_BASE.replace(/^http/, 'ws') + '/api/realtime?ticket=' + encodeURIComponent(ticket);
}

function scheduleReconnect() {
  if (closedByUser || backoffTimer || !navigator.onLine) return;
  const delay = Math.min(MAX_BACKOFF, BASE_BACKOFF * 2 ** attempt);
  attempt++;
  backoffTimer = setTimeout(
    () => {
      backoffTimer = null;
      openSocket();
    },
    delay + delay * 0.3 * Math.random()
  );
}

async function openSocket() {
  if (closedByUser) return;
  const gen = ++socketGen;
  socketReady = false;
  handlers.onStatus('connecting');

  let ticket;
  try {
    ticket = (await api.post(ticketPath)).ticket;
  } catch {
    if (gen !== socketGen || closedByUser) return;
    handlers.onStatus('offline');
    scheduleReconnect();
    return;
  }
  if (gen !== socketGen || closedByUser) return;

  let socket;
  try {
    socket = new WebSocket(wsURL(ticket));
  } catch {
    handlers.onStatus('offline');
    scheduleReconnect();
    return;
  }
  ws = socket;

  socket.onmessage = (ev) => {
    if (gen !== socketGen) return;
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    if (msg.type === 'realtime.ready') {
      attempt = 0;
      socketReady = true;
      handlers.onStatus('online');
      sendListingWatch();
      return;
    }
    handlers.onMessage(msg.type, msg.data);
  };

  socket.onclose = () => {
    if (gen !== socketGen) return;
    ws = null;
    socketReady = false;
    handlers.onStatus('offline');
    if (!closedByUser) scheduleReconnect();
  };

  socket.onerror = () => socket.close();
}

function ensureNetworkListeners() {
  if (listenersReady || typeof window === 'undefined') return;
  listenersReady = true;
  window.addEventListener('online', () => {
    if (closedByUser || ws) return;
    attempt = 0;
    clearTimeout(backoffTimer);
    backoffTimer = null;
    openSocket();
  });
  window.addEventListener('offline', () => {
    clearTimeout(backoffTimer);
    backoffTimer = null;
  });
}

export function connectRealtime(h) {
  handlers = { onMessage: h.onMessage || (() => {}), onStatus: h.onStatus || (() => {}) };
  ticketPath = h.ticketPath || '/api/realtime/ticket';
  closedByUser = false;
  attempt = 0;
  socketGen++;
  clearTimeout(backoffTimer);
  backoffTimer = null;
  if (ws) {
    ws.close();
    ws = null;
  }
  ensureNetworkListeners();
  openSocket();
}

export function disconnectRealtime() {
  closedByUser = true;
  socketGen++;
  socketReady = false;
  desiredListingId = null;
  hasDesiredListing = false;
  clearTimeout(backoffTimer);
  backoffTimer = null;
  attempt = 0;
  if (ws) {
    ws.close();
    ws = null;
  }
  handlers.onStatus('offline');
}

function sendFrame(frame) {
  if (!ws || !socketReady || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(frame));
  } catch {}
}

function sendListingWatch() {
  if (!hasDesiredListing) return;
  sendFrame({ type: 'listing.watch', data: { listingId: desiredListingId || '' } });
}

export function watchListing(listingId) {
  desiredListingId = listingId || null;
  hasDesiredListing = true;
  sendListingWatch();
}

export function clearListingWatch() {
  sendFrame({ type: 'listing.watch', data: { listingId: '' } });
  desiredListingId = null;
  hasDesiredListing = false;
}
