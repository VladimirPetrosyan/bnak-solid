import { describe, it, expect } from 'vitest';
import { yandexLocale, canUseYandex, sanitizeLabel, markerState, yandexHostVisible, mapErrorDetailKey } from './mapProvider';

describe('yandexLocale', () => {
  it('maps RU to the Russian Yandex locale', () => {
    expect(yandexLocale('RU')).toBe('ru_RU');
  });

  it('maps EN and Armenian to the same stable Russian Yandex locale, since reloading the global script per language is unreliable', () => {
    expect(yandexLocale('EN')).toBe('ru_RU');
    expect(yandexLocale('ՀՅ')).toBe('ru_RU');
  });

  it('returns null for unknown languages', () => {
    expect(yandexLocale('fr')).toBeNull();
    expect(yandexLocale(undefined)).toBeNull();
  });
});

describe('canUseYandex', () => {
  it('requires both a key and a supported locale', () => {
    expect(canUseYandex('RU', 'key')).toBe(true);
    expect(canUseYandex('EN', 'key')).toBe(true);
    expect(canUseYandex('ՀՅ', 'key')).toBe(true);
    expect(canUseYandex('RU', '')).toBe(false);
    expect(canUseYandex('RU', undefined)).toBe(false);
    expect(canUseYandex('fr', 'key')).toBe(false);
  });

  it('treats a whitespace-only key as absent', () => {
    expect(canUseYandex('RU', '   ')).toBe(false);
    expect(canUseYandex('RU', '\t\n')).toBe(false);
  });
});

describe('sanitizeLabel', () => {
  it('strips HTML-significant characters', () => {
    expect(sanitizeLabel('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert(1)');
    expect(sanitizeLabel('120 k ֏')).toBe('120 k ֏');
  });

  it('handles missing input without throwing', () => {
    expect(sanitizeLabel(undefined)).toBe('');
    expect(sanitizeLabel(null)).toBe('');
  });
});

describe('markerState', () => {
  it('flags the active listing as selected regardless of status', () => {
    const l = { id: 'r1', promoted: false };
    expect(markerState(l, 'r1', 'aging')).toEqual({ selected: true, fresh: false, vip: false });
  });

  it('flags fresh listings when not selected', () => {
    const l = { id: 'r2', promoted: false };
    expect(markerState(l, 'r1', 'fresh')).toEqual({ selected: false, fresh: true, vip: false });
  });

  it('flags vip independently of selection and freshness', () => {
    const l = { id: 'r2', promoted: true };
    expect(markerState(l, 'r1', 'due')).toEqual({ selected: false, fresh: false, vip: true });
  });
});

describe('yandexHostVisible', () => {
  it('shows the Yandex host while loading and once ready', () => {
    expect(yandexHostVisible('loading')).toBe(true);
    expect(yandexHostVisible('yandex')).toBe(true);
  });

  it('hides the Yandex host for every other status', () => {
    expect(yandexHostVisible('idle')).toBe(false);
    expect(yandexHostVisible('error')).toBe(false);
    expect(yandexHostVisible('none')).toBe(false);
    expect(yandexHostVisible(undefined)).toBe(false);
  });
});

describe('mapErrorDetailKey', () => {
  it('maps each known loader/init error code to its own i18n key', () => {
    expect(mapErrorDetailKey('no-key')).toBe('locationDevNoKey');
    expect(mapErrorDetailKey('timeout')).toBe('locationDevTimeout');
    expect(mapErrorDetailKey('script-error')).toBe('locationDevSdkError');
    expect(mapErrorDetailKey('init-error')).toBe('locationDevInitError');
  });

  it('returns null for unknown or missing codes, e.g. a superseded race', () => {
    expect(mapErrorDetailKey('superseded')).toBeNull();
    expect(mapErrorDetailKey(undefined)).toBeNull();
    expect(mapErrorDetailKey(null)).toBeNull();
  });
});
