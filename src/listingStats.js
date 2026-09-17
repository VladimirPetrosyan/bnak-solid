const DATE_LOCALES = { ՀՅ: 'hy-AM', RU: 'ru-RU', EN: 'en-US' };

export function formatListingDate(value, lang) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const locale = DATE_LOCALES[lang] || DATE_LOCALES.RU;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function postedAtOf(l) {
  if (!l) return null;
  if (l.createdAt) return l.createdAt;
  if (typeof l.ch === 'number') return new Date(Date.now() - l.ch * 3600000).toISOString();
  return null;
}

export function viewsOf(l) {
  return l && typeof l.views === 'number' ? l.views : null;
}

export function favoritesOf(l) {
  return l && typeof l.favorites === 'number' ? l.favorites : null;
}

export function complaintsOf(l) {
  return l && typeof l.complaints === 'number' ? l.complaints : null;
}
