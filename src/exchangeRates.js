const STALE_DAYS = 3;

function validateRate(r) {
  if (!r || typeof r !== 'object') return null;
  const amount = Number(r.amount);
  const rate = Number(r.rate);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return { amount, rate };
}

function parseDate(v) {
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

export function validateExchangeRateSnapshot(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const usd = validateRate(payload.usd);
  const rub = validateRate(payload.rub);
  if (!usd || !rub) return null;
  const publishedAt = parseDate(payload.publishedAt);
  const updatedAt = parseDate(payload.updatedAt);
  if (publishedAt === null || updatedAt === null) return null;
  return { usd, rub, publishedAt, updatedAt };
}

export function isNewerSnapshot(candidate, current) {
  if (!candidate) return false;
  if (!current) return true;
  return candidate.updatedAt > current.updatedAt;
}

export function amdToForeign(amd, rate) {
  if (!Number.isFinite(amd) || !rate) return null;
  return (amd * rate.amount) / rate.rate;
}

export function isSnapshotStale(snapshot, now = Date.now()) {
  if (!snapshot) return true;
  return calendarDaysBetween(snapshot.publishedAt, now) > STALE_DAYS;
}

function calendarDaysBetween(pastMs, nowMs) {
  const a = startOfUTCDay(pastMs);
  const b = startOfUTCDay(nowMs);
  return Math.round((b - a) / 86400000);
}

function startOfUTCDay(ms) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
