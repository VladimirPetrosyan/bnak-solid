export const YANDEX_MAPS_KEY = String(import.meta.env.VITE_YANDEX_MAPS_API_KEY || '').trim();

const YANDEX_LOCALE = 'ru_RU';
const YANDEX_SUPPORTED_LANGS = new Set(['RU', 'EN', 'ՀՅ']);

export function yandexLocale(lang) {
  return YANDEX_SUPPORTED_LANGS.has(lang) ? YANDEX_LOCALE : null;
}

export function canUseYandex(lang, key) {
  return Boolean(key && String(key).trim()) && yandexLocale(lang) !== null;
}

const ERROR_DETAIL_KEYS = {
  'no-key': 'locationDevNoKey',
  timeout: 'locationDevTimeout',
  'script-error': 'locationDevSdkError',
  'init-error': 'locationDevInitError'
};

export function mapErrorDetailKey(code) {
  return ERROR_DETAIL_KEYS[code] || null;
}

export function sanitizeLabel(text) {
  return String(text ?? '').replace(/[<>&"']/g, '');
}

export function markerState(l, activeId, status) {
  return {
    selected: l.id === activeId,
    fresh: status === 'fresh',
    vip: Boolean(l.promoted)
  };
}

export function yandexHostVisible(status) {
  return status === 'loading' || status === 'yandex';
}
