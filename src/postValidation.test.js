import { describe, it, expect } from 'vitest';
import { postStepErrorKey, postStepErrorKeys, MAX_STREET_LEN, MAX_DESC_LEN, MAX_AREA, MAX_FLOORS_TOTAL } from './postValidation';

function baseDraft(overrides) {
  return {
    street: 'Abovyan 41',
    phone: '55 214 806',
    area: '60',
    fl: '4',
    fls: '9',
    desc: '',
    photos: 5,
    repair: 'good',
    price: '380000',
    doc: true,
    cadastreCode: 'AB123',
    agree: true,
    ...overrides
  };
}

describe('postStepErrorKey step 2 (specs)', () => {
  it('passes with a valid repair condition and enough photos', () => {
    expect(postStepErrorKey(2, baseDraft())).toBeNull();
  });

  it('requires a repair condition to be picked', () => {
    expect(postStepErrorKey(2, baseDraft({ repair: '' }))).toBe('errRepairCondition');
  });

  it('rejects an unknown repair condition value', () => {
    expect(postStepErrorKey(2, baseDraft({ repair: 'unspecified' }))).toBe('errRepairCondition');
    expect(postStepErrorKey(2, baseDraft({ repair: 'luxury' }))).toBe('errRepairCondition');
  });

  it('still checks area/floor before repair condition', () => {
    expect(postStepErrorKey(2, baseDraft({ area: '', repair: '' }))).toBe('errArea');
    expect(postStepErrorKey(2, baseDraft({ photos: 2, repair: '' }))).toBe('errRepairCondition');
  });

  it('rejects an impossible floor/floor-count combination with its own errors, not just photos', () => {
    const keys = postStepErrorKeys(2, baseDraft({ fl: '999', fls: '0' }));
    expect(keys).toContain('errFloorsTotal');
    expect(keys).toContain('errFloor');
    expect(keys).not.toContain('errPhotos');
  });

  it('rejects a floor higher than the building floor count', () => {
    expect(postStepErrorKey(2, baseDraft({ fl: '10', fls: '9' }))).toBe('errFloorExceeds');
  });

  it('accepts the top floor', () => {
    expect(postStepErrorKey(2, baseDraft({ fl: '9', fls: '9' }))).toBeNull();
  });

  it('rejects an unreasonably large area', () => {
    expect(postStepErrorKey(2, baseDraft({ area: String(MAX_AREA + 1) }))).toBe('errAreaRange');
    expect(postStepErrorKey(2, baseDraft({ area: String(MAX_AREA) }))).toBeNull();
  });

  it('rejects a description longer than the limit', () => {
    expect(postStepErrorKey(2, baseDraft({ desc: 'a'.repeat(MAX_DESC_LEN + 1) }))).toBe('errDescTooLong');
    expect(postStepErrorKey(2, baseDraft({ desc: 'a'.repeat(MAX_DESC_LEN) }))).toBeNull();
  });

  it('reports every broken field at once, not just the first one', () => {
    const keys = postStepErrorKeys(2, baseDraft({ area: '', fl: '', fls: '', repair: '', photos: 1 }));
    expect(keys).toEqual(expect.arrayContaining(['errArea', 'errFloorsTotal', 'errFloor', 'errRepairCondition', 'errPhotos']));
    expect(keys.length).toBe(5);
  });
});

describe('postStepErrorKey other steps', () => {
  it('step 1 requires street and a phone with at least 8 digits', () => {
    expect(postStepErrorKey(1, baseDraft())).toBeNull();
    expect(postStepErrorKey(1, baseDraft({ street: '  ' }))).toBe('errStreet');
    expect(postStepErrorKey(1, baseDraft({ phone: '55 21' }))).toBe('errPhone');
  });

  it('rejects a street longer than the limit', () => {
    expect(postStepErrorKey(1, baseDraft({ street: 'a'.repeat(MAX_STREET_LEN + 1) }))).toBe('errStreetTooLong');
    expect(postStepErrorKey(1, baseDraft({ street: 'a'.repeat(MAX_STREET_LEN) }))).toBeNull();
  });

  it('step 3 requires a positive price', () => {
    expect(postStepErrorKey(3, baseDraft())).toBeNull();
    expect(postStepErrorKey(3, baseDraft({ price: '0' }))).toBe('errPrice');
    expect(postStepErrorKey(3, baseDraft({ price: '' }))).toBe('errPrice');
  });

  it('hotel needs a name but no area, floor, repair condition, price or cadastre code', () => {
    const hotel = baseDraft({ deal: 'hotel', title: 'Ararat Hostel', area: '', fl: '', fls: '', repair: '', price: '', cadastreCode: '' });
    expect(postStepErrorKey(1, hotel)).toBeNull();
    expect(postStepErrorKey(1, { ...hotel, title: ' ' })).toBe('errHotelRequired');
    expect(postStepErrorKey(2, hotel)).toBeNull();
    expect(postStepErrorKey(2, { ...hotel, photos: 1 })).toBe('errPhotos');
    expect(postStepErrorKey(3, hotel)).toBeNull();
    expect(postStepErrorKey(4, hotel)).toBeNull();
    expect(postStepErrorKey(4, { ...hotel, doc: false })).toBe('errDoc');
  });

  it('step 4 requires document, cadastre code and agreement', () => {
    expect(postStepErrorKey(4, baseDraft())).toBeNull();
    expect(postStepErrorKey(4, baseDraft({ doc: false }))).toBe('errDoc');
    expect(postStepErrorKey(4, baseDraft({ cadastreCode: ' ' }))).toBe('errCadastre');
    expect(postStepErrorKey(4, baseDraft({ agree: false }))).toBe('errAgree');
  });
});

describe('MAX_FLOORS_TOTAL', () => {
  it('rejects an unreasonably tall building', () => {
    expect(postStepErrorKey(2, baseDraft({ fls: String(MAX_FLOORS_TOTAL + 1), fl: String(MAX_FLOORS_TOTAL + 1) }))).toBe('errFloorsTotal');
    expect(postStepErrorKey(2, baseDraft({ fls: String(MAX_FLOORS_TOTAL), fl: String(MAX_FLOORS_TOTAL) }))).toBeNull();
  });
});
