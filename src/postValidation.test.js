import { describe, it, expect } from 'vitest';
import { postStepErrorKey } from './postValidation';

function baseDraft(overrides) {
  return {
    street: 'Abovyan 41',
    phone: '55 214 806',
    area: '60',
    fl: '4',
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

  it('still checks area/floor and photo count before repair condition', () => {
    expect(postStepErrorKey(2, baseDraft({ area: '', repair: '' }))).toBe('errArea');
    expect(postStepErrorKey(2, baseDraft({ photos: 2, repair: '' }))).toBe('errPhotos');
  });
});

describe('postStepErrorKey other steps', () => {
  it('step 1 requires street and a phone with at least 8 digits', () => {
    expect(postStepErrorKey(1, baseDraft())).toBeNull();
    expect(postStepErrorKey(1, baseDraft({ street: '  ' }))).toBe('errStreet');
    expect(postStepErrorKey(1, baseDraft({ phone: '55 21' }))).toBe('errPhone');
  });

  it('step 3 requires a positive price', () => {
    expect(postStepErrorKey(3, baseDraft())).toBeNull();
    expect(postStepErrorKey(3, baseDraft({ price: '0' }))).toBe('errPrice');
    expect(postStepErrorKey(3, baseDraft({ price: '' }))).toBe('errPrice');
  });

  it('hotel needs a name but no area, repair condition, price or cadastre code', () => {
    const hotel = baseDraft({ deal: 'hotel', title: 'Ararat Hostel', area: '', fl: '', repair: '', price: '', cadastreCode: '' });
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
