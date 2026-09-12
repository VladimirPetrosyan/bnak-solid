import { describe, it, expect } from 'vitest';
import { formatListingDate, postedAtOf, viewsOf, favoritesOf } from './listingStats';

describe('formatListingDate', () => {
  it('formats a valid ISO date for each language', () => {
    const iso = '2026-03-05T10:00:00.000Z';
    expect(formatListingDate(iso, 'EN')).toContain('2026');
    expect(formatListingDate(iso, 'RU')).toContain('2026');
    expect(formatListingDate(iso, 'ՀՅ')).toContain('2026');
  });

  it('is empty for a missing value', () => {
    expect(formatListingDate(null, 'EN')).toBe('');
    expect(formatListingDate(undefined, 'EN')).toBe('');
    expect(formatListingDate('', 'EN')).toBe('');
  });

  it('is empty for an invalid date string', () => {
    expect(formatListingDate('not-a-date', 'EN')).toBe('');
  });

  it('falls back to the RU locale for an unknown language', () => {
    expect(formatListingDate('2026-03-05T10:00:00.000Z', 'XX')).toContain('2026');
  });
});

describe('postedAtOf', () => {
  it('prefers the real createdAt when present', () => {
    expect(postedAtOf({ createdAt: '2026-01-01T00:00:00.000Z', ch: 5 })).toBe('2026-01-01T00:00:00.000Z');
  });

  it('derives a date from hours-ago when createdAt is missing', () => {
    const before = Date.now();
    const iso = postedAtOf({ ch: 24 });
    const ms = new Date(iso).getTime();
    expect(before - ms).toBeGreaterThanOrEqual(24 * 3600000 - 1000);
    expect(before - ms).toBeLessThanOrEqual(24 * 3600000 + 1000);
  });

  it('is null when neither createdAt nor ch is available', () => {
    expect(postedAtOf({})).toBeNull();
    expect(postedAtOf(null)).toBeNull();
  });
});

describe('viewsOf / favoritesOf', () => {
  it('use the real backend count when present', () => {
    expect(viewsOf({ id: 'r1', views: 42 })).toBe(42);
    expect(favoritesOf({ id: 'r1', favorites: 7 })).toBe(7);
  });

  it('is null when stats have not loaded yet', () => {
    expect(viewsOf({ id: 'r1' })).toBeNull();
    expect(favoritesOf({ id: 'r1' })).toBeNull();
  });

  it('handles a missing listing', () => {
    expect(viewsOf(null)).toBeNull();
    expect(favoritesOf(undefined)).toBeNull();
  });
});
