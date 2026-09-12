import { describe, it, expect } from 'vitest';
import { validateExchangeRateSnapshot, isNewerSnapshot, amdToForeign, isSnapshotStale } from './exchangeRates';

function payload(overrides = {}) {
  return {
    usd: { amount: 1, rate: 365.38 },
    rub: { amount: 1, rate: 4.3633 },
    publishedAt: '2026-08-24T00:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    ...overrides
  };
}

describe('validateExchangeRateSnapshot', () => {
  it('accepts a well-formed payload', () => {
    const s = validateExchangeRateSnapshot(payload());
    expect(s).toEqual({
      usd: { amount: 1, rate: 365.38 },
      rub: { amount: 1, rate: 4.3633 },
      publishedAt: Date.parse('2026-08-24T00:00:00Z'),
      updatedAt: Date.parse('2026-08-24T10:00:00Z')
    });
  });

  it('respects a non-1 Amount in the conversion factor', () => {
    const s = validateExchangeRateSnapshot(payload({ rub: { amount: 10, rate: 43.633 } }));
    expect(s.rub).toEqual({ amount: 10, rate: 43.633 });
  });

  it.each([null, undefined, 'x', 42, []])('rejects a non-object payload %p', (v) => {
    expect(validateExchangeRateSnapshot(v)).toBeNull();
  });

  it('rejects a missing usd or rub block', () => {
    expect(validateExchangeRateSnapshot(payload({ usd: undefined }))).toBeNull();
    expect(validateExchangeRateSnapshot(payload({ rub: undefined }))).toBeNull();
  });

  it.each([0, -1, NaN, Infinity, -Infinity, 'abc', null])('rejects a non-positive-finite amount %p', (bad) => {
    expect(validateExchangeRateSnapshot(payload({ usd: { amount: bad, rate: 365.38 } }))).toBeNull();
  });

  it.each([0, -1, NaN, Infinity, -Infinity, 'abc', null])('rejects a non-positive-finite rate %p', (bad) => {
    expect(validateExchangeRateSnapshot(payload({ usd: { amount: 1, rate: bad } }))).toBeNull();
  });

  it('rejects a missing or invalid publishedAt/updatedAt', () => {
    expect(validateExchangeRateSnapshot(payload({ publishedAt: undefined }))).toBeNull();
    expect(validateExchangeRateSnapshot(payload({ publishedAt: 'not-a-date' }))).toBeNull();
    expect(validateExchangeRateSnapshot(payload({ updatedAt: undefined }))).toBeNull();
    expect(validateExchangeRateSnapshot(payload({ updatedAt: 'not-a-date' }))).toBeNull();
  });
});

describe('amdToForeign', () => {
  it('applies the AMD * Amount / Rate formula', () => {
    expect(amdToForeign(365380, { amount: 1, rate: 365.38 })).toBeCloseTo(1000, 6);
  });

  it('accounts for a non-1 Amount', () => {
    expect(amdToForeign(43633, { amount: 10, rate: 43.633 })).toBeCloseTo(10000, 6);
  });

  it('returns null for a non-finite AMD input', () => {
    expect(amdToForeign(NaN, { amount: 1, rate: 365.38 })).toBeNull();
    expect(amdToForeign(undefined, { amount: 1, rate: 365.38 })).toBeNull();
  });

  it('returns null without a rate', () => {
    expect(amdToForeign(1000, null)).toBeNull();
  });
});

describe('isNewerSnapshot', () => {
  const older = validateExchangeRateSnapshot(payload({ updatedAt: '2026-08-24T09:00:00Z' }));
  const newer = validateExchangeRateSnapshot(payload({ updatedAt: '2026-08-24T10:00:00Z' }));

  it('accepts any snapshot when there is no current one', () => {
    expect(isNewerSnapshot(newer, null)).toBe(true);
  });

  it('accepts a snapshot with a later updatedAt', () => {
    expect(isNewerSnapshot(newer, older)).toBe(true);
  });

  it('rejects a snapshot with an equal or earlier updatedAt', () => {
    expect(isNewerSnapshot(older, newer)).toBe(false);
    expect(isNewerSnapshot(older, older)).toBe(false);
  });

  it('rejects a null candidate', () => {
    expect(isNewerSnapshot(null, older)).toBe(false);
  });
});

describe('isSnapshotStale', () => {
  const now = Date.parse('2026-08-25T12:00:00Z');

  it('is not stale exactly on the 3-day boundary', () => {
    const s = validateExchangeRateSnapshot(payload({ publishedAt: '2026-08-22T12:00:00Z' }));
    expect(isSnapshotStale(s, now)).toBe(false);
  });

  it('is stale just past the 3-day boundary', () => {
    const s = validateExchangeRateSnapshot(payload({ publishedAt: '2026-08-21T23:59:00Z' }));
    expect(isSnapshotStale(s, now)).toBe(true);
  });

  it('is stale without a snapshot', () => {
    expect(isSnapshotStale(null, now)).toBe(true);
  });

  it('uses calendar days, not a 72h rolling window', () => {
    const s = validateExchangeRateSnapshot(payload({ publishedAt: '2026-08-22T00:01:00Z' }));
    expect(isSnapshotStale(s, Date.parse('2026-08-25T23:59:00Z'))).toBe(false);
  });
});
