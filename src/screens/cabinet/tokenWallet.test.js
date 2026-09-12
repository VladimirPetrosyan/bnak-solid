import { describe, it, expect } from 'vitest';
import { clampProgress, canPromote, vipShortfall, vipTimeLeft, txKindLabelKey, recentTransactions } from './walletModel';

describe('clampProgress', () => {
  it('is 0 at zero balance', () => {
    expect(clampProgress(0, 100)).toBe(0);
  });

  it('is 99 just under the cost', () => {
    expect(clampProgress(99, 100)).toBe(99);
  });

  it('is 100 exactly at the cost', () => {
    expect(clampProgress(100, 100)).toBe(100);
  });

  it('clamps above 100 when balance exceeds the cost', () => {
    expect(clampProgress(250, 100)).toBe(100);
  });

  it('treats a missing cost as fully reachable once balance is positive', () => {
    expect(clampProgress(10, 0)).toBe(100);
    expect(clampProgress(10, undefined)).toBe(100);
  });

  it('treats a missing cost with zero balance as empty', () => {
    expect(clampProgress(0, undefined)).toBe(0);
  });

  it('never goes negative', () => {
    expect(clampProgress(-5, 100)).toBe(0);
  });
});

describe('canPromote', () => {
  it('is false below the cost', () => {
    expect(canPromote(99, 100)).toBe(false);
  });

  it('is true exactly at the cost', () => {
    expect(canPromote(100, 100)).toBe(true);
  });

  it('is true above the cost', () => {
    expect(canPromote(250, 100)).toBe(true);
  });

  it('is false when cost is missing or zero', () => {
    expect(canPromote(100, 0)).toBe(false);
    expect(canPromote(100, undefined)).toBe(false);
  });
});

describe('vipShortfall', () => {
  it('is the missing amount below the cost', () => {
    expect(vipShortfall(40, 100)).toBe(60);
  });

  it('is 0 once the balance meets or exceeds the cost', () => {
    expect(vipShortfall(100, 100)).toBe(0);
    expect(vipShortfall(250, 100)).toBe(0);
  });

  it('is 0 when the cost is missing or zero', () => {
    expect(vipShortfall(40, 0)).toBe(0);
    expect(vipShortfall(40, undefined)).toBe(0);
  });
});

describe('vipTimeLeft', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();

  it('reports days and hours when more than a day remains', () => {
    const until = new Date('2026-01-02T05:30:00.000Z').toISOString();
    expect(vipTimeLeft(until, now)).toEqual({ days: 1, hours: 5, minutes: 30 });
  });

  it('reports hours and minutes when less than a day remains', () => {
    const until = new Date('2026-01-01T05:15:00.000Z').toISOString();
    expect(vipTimeLeft(until, now)).toEqual({ days: 0, hours: 5, minutes: 15 });
  });

  it('reports minutes only when less than an hour remains', () => {
    const until = new Date('2026-01-01T00:20:00.000Z').toISOString();
    expect(vipTimeLeft(until, now)).toEqual({ days: 0, hours: 0, minutes: 20 });
  });

  it('is null once the deadline has passed', () => {
    const until = new Date('2025-12-31T23:00:00.000Z').toISOString();
    expect(vipTimeLeft(until, now)).toBeNull();
  });

  it('is null for an invalid or missing date', () => {
    expect(vipTimeLeft('not-a-date', now)).toBeNull();
    expect(vipTimeLeft(null, now)).toBeNull();
    expect(vipTimeLeft(undefined, now)).toBeNull();
  });
});

describe('txKindLabelKey', () => {
  it('maps known kinds', () => {
    expect(txKindLabelKey('signup')).toBe('txKindSignup');
    expect(txKindLabelKey('vip_promote')).toBe('txKindVip');
  });

  it('maps the new backend kinds', () => {
    expect(txKindLabelKey('mark_taken')).toBe('txKindMarkTaken');
    expect(txKindLabelKey('useful_report')).toBe('txKindUsefulReport');
  });

  it('falls back to a generic label key for unknown values', () => {
    expect(txKindLabelKey('mystery')).toBe('txKindOther');
  });
});

describe('recentTransactions', () => {
  const txs = [
    { id: 5, amount: -100, kind: 'vip_promote', createdAt: '2026-01-05' },
    { id: 4, amount: 10, kind: 'quality_photos', createdAt: '2026-01-04' },
    { id: 3, amount: 25, kind: 'cadastre_verified', createdAt: '2026-01-03' },
    { id: 2, amount: 40, kind: 'first_approved_listing', createdAt: '2026-01-02' },
    { id: 1, amount: 10, kind: 'signup', createdAt: '2026-01-01' },
    { id: 0, amount: 10, kind: 'profile_complete', createdAt: '2026-01-00' }
  ];

  it('keeps only the first 5 by default', () => {
    const out = recentTransactions(txs);
    expect(out).toHaveLength(5);
    expect(out.map((x) => x.id)).toEqual([5, 4, 3, 2, 1]);
  });

  it('maps kind to a label key and keeps signed amount', () => {
    const out = recentTransactions(txs, 1);
    expect(out).toEqual([{ id: 5, amount: -100, labelKey: 'txKindVip', createdAt: '2026-01-05' }]);
  });

  it('handles an empty list', () => {
    expect(recentTransactions([])).toEqual([]);
    expect(recentTransactions(undefined)).toEqual([]);
  });
});
