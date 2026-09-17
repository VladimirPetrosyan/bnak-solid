import { describe, it, expect } from 'vitest';
import { pageTitle } from './pageTitle';
import { dict } from './i18n';

const t = dict('RU');

describe('pageTitle', () => {
  it('builds a search title from the deal type and city', () => {
    expect(pageTitle('search', { dealTitle: 'Аренда квартир', city: 'Ереван' }, t)).toBe('Аренда квартир · Ереван — HayHome');
  });

  it('builds a listing title from its details', () => {
    expect(pageTitle('listing', { listingTitle: '2 комн., Кентрон, Абовяна 41' }, t)).toBe('2 комн., Кентрон, Абовяна 41 — HayHome');
  });

  it('falls back to the default title when the listing is unknown', () => {
    expect(pageTitle('listing', {}, t)).toBe('HayHome — жильё в Армении');
  });

  it('titles the map, chat, and auth screens', () => {
    expect(pageTitle('map', {}, t)).toBe('Карта объявлений — HayHome');
    expect(pageTitle('chat', {}, t)).toBe('Сообщения — HayHome');
    expect(pageTitle('auth', {}, t)).toBe('Войти — HayHome');
  });

  it('titles the 404 screen', () => {
    expect(pageTitle('notFound', {}, t)).toBe('Страница не найдена — HayHome');
  });

  it('titles a legal document page', () => {
    expect(pageTitle('legal', { legalTitle: 'Пользовательское соглашение' }, t)).toBe('Пользовательское соглашение — HayHome');
  });
});
