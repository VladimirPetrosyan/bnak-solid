import { describe, it, expect } from 'vitest';
import { buildListingPayload } from './postPayload';

function baseDraft(overrides) {
  return {
    deal: 'rent',
    city: 'yerevan',
    dist: 'kentron',
    street: 'Abovyan 41',
    price: '380 000',
    rooms: 2,
    area: '60',
    fl: '4',
    fls: '9',
    feats: { furn: true, ac: false },
    desc: 'Nice place',
    dep: '1',
    cadastreCode: ' AB123 ',
    repair: 'good',
    ...overrides
  };
}

describe('buildListingPayload', () => {
  it('carries the chosen repair condition through to the API payload', () => {
    expect(buildListingPayload(baseDraft()).repairCondition).toBe('good');
    expect(buildListingPayload(baseDraft({ repair: 'designer' })).repairCondition).toBe('designer');
  });

  it('parses numeric fields and strips spaces from price', () => {
    const body = buildListingPayload(baseDraft());
    expect(body.price).toBe(380000);
    expect(body.area).toBe(60);
    expect(body.fl).toBe(4);
    expect(body.fls).toBe(9);
  });

  it('keeps only the enabled feature keys and trims the cadastre code', () => {
    const body = buildListingPayload(baseDraft());
    expect(body.f).toEqual(['furn']);
    expect(body.cadastreCode).toBe('AB123');
  });

  it('does not silently invent a repair condition when none was chosen', () => {
    expect(buildListingPayload(baseDraft({ repair: '' })).repairCondition).toBe('');
  });

  it('sends hotel fields and drops apartment-only values for a hotel', () => {
    const body = buildListingPayload(
      baseDraft({ deal: 'hotel', title: '  Ararat Hostel ', stayKind: 'hostel', checkInTime: '14:00', checkOutTime: '11:00' })
    );
    expect(body).toMatchObject({ title: 'Ararat Hostel', stayKind: 'hostel', checkIn: '14:00', checkOut: '11:00' });
    expect(body).toMatchObject({ price: 0, area: 0, cadastreCode: '', repairCondition: '' });
  });

  it('does not send hotel fields for regular listings', () => {
    expect(buildListingPayload(baseDraft())).not.toHaveProperty('title');
  });

  it('sends the chosen star rating for a hotel and defaults to 0 when unset', () => {
    const rated = buildListingPayload(baseDraft({ deal: 'hotel', title: 'Ararat Hostel', stayKind: 'hostel', stars: 4 }));
    expect(rated.stars).toBe(4);
    const unrated = buildListingPayload(baseDraft({ deal: 'hotel', title: 'Ararat Hostel', stayKind: 'hostel' }));
    expect(unrated.stars).toBe(0);
  });
});
