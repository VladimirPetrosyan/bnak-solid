import { describe, it, expect } from 'vitest';
import { isSameSearch, findDuplicateSearch } from './savedSearch';

const base = { deal: 'rent', city: 'yerevan', rooms: 'all', priceMax: '' };

describe('isSameSearch', () => {
  it('treats identical filter sets as the same search', () => {
    expect(isSameSearch(base, { ...base })).toBe(true);
  });

  it('is order/type tolerant for rooms and priceMax', () => {
    expect(isSameSearch({ ...base, rooms: 2 }, { ...base, rooms: '2' })).toBe(true);
    expect(isSameSearch({ ...base, priceMax: null }, { ...base, priceMax: '' })).toBe(true);
  });

  it('treats a different deal, city, rooms or priceMax as a different search', () => {
    expect(isSameSearch(base, { ...base, deal: 'sale' })).toBe(false);
    expect(isSameSearch(base, { ...base, city: 'gyumri' })).toBe(false);
    expect(isSameSearch(base, { ...base, rooms: 2 })).toBe(false);
    expect(isSameSearch(base, { ...base, priceMax: '200000' })).toBe(false);
  });
});

describe('findDuplicateSearch', () => {
  it('finds a duplicate among saved searches', () => {
    expect(findDuplicateSearch([{ ...base, label: 'x' }], base)).toBe(true);
  });

  it('returns false for an empty or non-matching list', () => {
    expect(findDuplicateSearch([], base)).toBe(false);
    expect(findDuplicateSearch(null, base)).toBe(false);
    expect(findDuplicateSearch([{ ...base, city: 'gyumri' }], base)).toBe(false);
  });
});
