import { describe, it, expect } from 'vitest';
import { revisionDiff } from './revisionDiff';

describe('revisionDiff', () => {
  it('returns empty array when nothing changed', () => {
    const listing = { deal: 'rent', city: 'yerevan', street: 'Test str', price: 100000, f: ['furn'] };
    const proposed = { deal: 'rent', city: 'yerevan', street: 'Test str', price: 100000, f: ['furn'] };
    expect(revisionDiff(listing, proposed)).toEqual([]);
  });

  it('returns only the fields that changed', () => {
    const listing = { deal: 'rent', city: 'yerevan', street: 'Old str', price: 100000, area: 40 };
    const proposed = { deal: 'rent', city: 'yerevan', street: 'New str', price: 120000, area: 40 };
    const diff = revisionDiff(listing, proposed);
    expect(diff).toEqual([
      { key: 'street', before: 'Old str', after: 'New str' },
      { key: 'price', before: 100000, after: 120000 }
    ]);
  });

  it('flags a changed repair condition', () => {
    const listing = { street: 'Old str', repairCondition: 'none' };
    const proposed = { street: 'Old str', repairCondition: 'designer' };
    expect(revisionDiff(listing, proposed)).toEqual([{ key: 'repairCondition', before: 'none', after: 'designer' }]);
  });

  it('compares array fields by content, not identity', () => {
    const listing = { f: ['furn', 'balcony'] };
    const proposed = { f: ['furn', 'balcony'] };
    expect(revisionDiff(listing, proposed)).toEqual([]);
  });

  it('flags array fields when order or content differs', () => {
    const listing = { f: ['furn'] };
    const proposed = { f: ['furn', 'balcony'] };
    expect(revisionDiff(listing, proposed)).toEqual([{ key: 'f', before: ['furn'], after: ['furn', 'balcony'] }]);
  });

  it('treats missing array fields as empty', () => {
    const listing = {};
    const proposed = { f: [] };
    expect(revisionDiff(listing, proposed)).toEqual([]);
  });

  it('returns empty array when listing or proposed is missing', () => {
    expect(revisionDiff(null, { street: 'x' })).toEqual([]);
    expect(revisionDiff({ street: 'x' }, null)).toEqual([]);
    expect(revisionDiff(undefined, undefined)).toEqual([]);
  });
});
