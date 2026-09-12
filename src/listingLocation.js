const LAT_MIN = -90;
const LAT_MAX = 90;
const LNG_MIN = -180;
const LNG_MAX = 180;

const DEFAULT_ZOOM = 17;
const MIN_ZOOM = 0;
const MAX_ZOOM = 21;

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function validPoint(point) {
  if (!point || typeof point !== 'object') return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) return null;
  return { lat, lng };
}

export function parseCoords(ll) {
  if (!Array.isArray(ll) || ll.length !== 2) return null;
  return validPoint({ lat: ll[0], lng: ll[1] });
}

export function viewUrl(point, zoom = DEFAULT_ZOOM) {
  const p = validPoint(point);
  if (!p) return null;
  const { lat, lng } = p;
  const z = clamp(Math.round(finiteOr(zoom, DEFAULT_ZOOM)), MIN_ZOOM, MAX_ZOOM);
  const params = new URLSearchParams({ pt: `${lng.toFixed(6)},${lat.toFixed(6)}`, z: String(z), l: 'map' });
  return `https://yandex.com/maps/?${params.toString()}`;
}

export function searchUrl(address) {
  const trimmed = typeof address === 'string' ? address.trim() : '';
  if (!trimmed) return 'https://yandex.com/maps/';
  const params = new URLSearchParams({ text: trimmed });
  return `https://yandex.com/maps/?${params.toString()}`;
}
