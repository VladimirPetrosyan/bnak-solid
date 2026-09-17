import { describe, it, expect, vi } from 'vitest';
import { listingRow } from './listingRow';

const colors = {
  TEAL: 'TEAL',
  TEAL_T: 'TEAL_T',
  TEAL_TX: 'TEAL_TX',
  RED: 'RED',
  RED_T: 'RED_T',
  RED_TX: 'RED_TX',
  SOFT: 'SOFT',
  FAINT: 'FAINT',
  MUTED: 'MUTED',
  INK: 'INK'
};

const dict = {
  stDue: 'stDue',
  stFlag: 'stFlag',
  stArch: 'stArch',
  hiddenW: 'hiddenW',
  reviewW: 'reviewW',
  actReturn: 'actReturn',
  actAnswer: 'actAnswer',
  actConfirmed: 'actConfirmed',
  actConfirm: 'actConfirm',
  actConfirming: 'actConfirming',
  vipActive: 'vipActive',
  vipActivate: 'vipActivate',
  vipCheckingW: 'vipCheckingW'
};

function makeDeps(overrides = {}) {
  return {
    statusOf: () => 'fresh',
    hoursOf: () => 10,
    agoOf: () => '10h',
    clock: (s) => `clock:${s}`,
    isConfirmed: () => false,
    isVipBusy: () => false,
    t: () => dict,
    txt: (key, params) => `${key}:${JSON.stringify(params)}`,
    returnToFeed: vi.fn(),
    confirmBySms: vi.fn(),
    activateVip: vi.fn(),
    wallet: () => ({ loading: false, ready: true, cost: 100, balance: 500 }),
    now: () => 0,
    say: vi.fn(),
    colors,
    ...overrides
  };
}

const listing = { id: 'l1', area: 50, price: 100000, ch: 5 };

describe('listingRow', () => {
  it('fresh listing shows teal chip and a running clock', () => {
    const r = listingRow(listing, makeDeps({ statusOf: () => 'fresh' }));
    expect(r.isDue()).toBe(false);
    expect(r.isFlag()).toBe(false);
    expect(r.isArch()).toBe(false);
    expect(r.chipBg()).toBe('TEAL_T');
    expect(r.chipFg()).toBe('TEAL_TX');
    expect(r.chipText()).toBe('stToday:{"x":"10h"}');
    expect(r.left()).toBe('clock:223200');
    expect(r.leftFg()).toBe('INK');
    expect(r.btnLabel()).toBe('actConfirm');
    expect(r.btnBg()).toBe('TEAL');
    expect(r.btnFg()).toBe('#fff');
  });

  it('aging listing keeps the "today" chip text but with soft colors', () => {
    const r = listingRow(listing, makeDeps({ statusOf: () => 'aging' }));
    expect(r.chipBg()).toBe('SOFT');
    expect(r.chipFg()).toBe('MUTED');
    expect(r.chipText()).toBe('stToday:{"x":"10h"}');
  });

  it('due listing turns red and warns via leftFg until confirmed', () => {
    const r = listingRow(listing, makeDeps({ statusOf: () => 'due' }));
    expect(r.isDue()).toBe(true);
    expect(r.chipBg()).toBe('RED_T');
    expect(r.chipFg()).toBe('RED_TX');
    expect(r.chipText()).toBe('stDue');
    expect(r.leftFg()).toBe('RED');
    expect(r.btnBg()).toBe('RED');
    expect(r.btnLabel()).toBe('actConfirm');
  });

  it('flagged listing offers to answer and reports the real complaint count', () => {
    const deps = makeDeps({ statusOf: () => 'flagged' });
    const flagged = { ...listing, complaints: 3 };
    const r = listingRow(flagged, deps);
    expect(r.isFlag()).toBe(true);
    expect(r.chipText()).toBe('stFlag');
    expect(r.left()).toBe('reviewW');
    expect(r.btnLabel()).toBe('actAnswer');
    expect(r.btnBg()).toBe('RED');
    expect(r.complaints()).toBe(3);

    r.act();
    expect(deps.confirmBySms).toHaveBeenCalledWith('l1');
    expect(deps.returnToFeed).not.toHaveBeenCalled();
  });

  it('never invents a complaint count that was not reported by the API', () => {
    const r = listingRow(listing, makeDeps({ statusOf: () => 'flagged' }));
    expect(r.complaints()).toBe(0);
  });

  it('archived/rented listing offers to return it to the feed', () => {
    const deps = makeDeps({ statusOf: () => 'archived' });
    const r = listingRow(listing, deps);
    expect(r.isArch()).toBe(true);
    expect(r.chipText()).toBe('stArch');
    expect(r.left()).toBe('hiddenW');
    expect(r.btnLabel()).toBe('actReturn');
    expect(r.btnBg()).toBe('#fff');
    expect(r.btnFg()).toBe('INK');
    expect(r.btnBd()).toBe('#e8e7e4');

    r.act();
    expect(deps.returnToFeed).toHaveBeenCalledWith('l1');
    expect(deps.confirmBySms).not.toHaveBeenCalled();
  });

  it('confirmed due listing shows actConfirmed and stops warning', () => {
    const r = listingRow(listing, makeDeps({ statusOf: () => 'due', isConfirmed: () => true }));
    expect(r.done()).toBe(true);
    expect(r.leftFg()).toBe('INK');
    expect(r.btnLabel()).toBe('actConfirmed');
    expect(r.btnBg()).toBe('SOFT');
    expect(r.btnFg()).toBe('MUTED');
  });

  it('confirms an unconfirmed listing via act() when not archived', () => {
    const deps = makeDeps({ statusOf: () => 'fresh' });
    const r = listingRow(listing, deps);
    r.act();
    expect(deps.confirmBySms).toHaveBeenCalledWith('l1');
    expect(deps.returnToFeed).not.toHaveBeenCalled();
  });

  it('handles a listing missing optional fields without throwing', () => {
    const r = listingRow({ id: 'bare' }, makeDeps());
    expect(() => r.chipText()).not.toThrow();
    expect(r.views).toBeNull();
    expect(r.complaints()).toBe(0);
  });

  it('shows real stats when loaded, null otherwise', () => {
    const loaded = listingRow({ id: 'l1', remote: true, views: 10, favorites: 4 }, makeDeps());
    expect(loaded.views).toBe(10);
    expect(loaded.favorites).toBe(4);

    const unloaded = listingRow({ id: 'l1', remote: true }, makeDeps());
    expect(unloaded.views).toBeNull();
    expect(unloaded.favorites).toBeNull();
  });
});

describe('listingRow vip eligibility', () => {
  const remoteListing = { id: 'l1', area: 50, price: 100000, remote: true };

  it('is eligible for a remote active listing and not disabled', () => {
    const r = listingRow(remoteListing, makeDeps({ statusOf: () => 'fresh' }));
    expect(r.vipEligible).toBe(true);
    expect(r.vipActive()).toBe(false);
    expect(r.vipDisabled()).toBe(false);
    expect(r.vipLabel()).toBe('vipPromoteCost:{"cost":100}');
  });

  it('is not eligible for a local (non-remote) listing', () => {
    const r = listingRow({ id: 'local1', area: 50, price: 100000 }, makeDeps({ statusOf: () => 'fresh' }));
    expect(r.vipEligible).toBe(false);
  });

  it('is not eligible for a non-active remote listing', () => {
    const r = listingRow(remoteListing, makeDeps({ statusOf: () => 'archived' }));
    expect(r.vipEligible).toBe(false);
  });

  it('blocks a second click while a request is in flight', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', isVipBusy: () => true });
    const r = listingRow(remoteListing, deps);
    expect(r.vipDisabled()).toBe(true);
    r.onVip();
    r.onVip();
    expect(deps.activateVip).not.toHaveBeenCalled();
  });

  it('activates vip once per click when eligible and balance is sufficient', () => {
    const deps = makeDeps({ statusOf: () => 'fresh' });
    const r = listingRow(remoteListing, deps);
    r.onVip();
    expect(deps.activateVip).toHaveBeenCalledTimes(1);
    expect(deps.activateVip).toHaveBeenCalledWith('l1');
    expect(deps.say).not.toHaveBeenCalled();
  });
});

describe('listingRow vip wallet gating', () => {
  const remoteListing = { id: 'l1', area: 50, price: 100000, remote: true };

  it('shows a neutral label without a price while the wallet is loading', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', wallet: () => ({ loading: true, ready: false, cost: 0, balance: 0 }) });
    const r = listingRow(remoteListing, deps);
    expect(r.vipLabel()).toBe('vipCheckingW');
    expect(r.vipDisabled()).toBe(true);
  });

  it('does not call the api and toasts when the balance is insufficient', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', wallet: () => ({ loading: false, ready: true, cost: 100, balance: 40 }) });
    const r = listingRow(remoteListing, deps);
    expect(r.vipLabel()).toBe('vipMissingTokens:{"n":60}');
    expect(r.vipDisabled()).toBe(false);
    r.onVip();
    expect(deps.activateVip).not.toHaveBeenCalled();
    expect(deps.say).toHaveBeenCalledWith('vipInsufficientToast:{"n":60}');
  });

  it('activates vip when the balance exactly matches the cost', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', wallet: () => ({ loading: false, ready: true, cost: 100, balance: 100 }) });
    const r = listingRow(remoteListing, deps);
    expect(r.vipDisabled()).toBe(false);
    r.onVip();
    expect(deps.activateVip).toHaveBeenCalledWith('l1');
    expect(deps.say).not.toHaveBeenCalled();
  });
});

describe('listingRow vip active countdown', () => {
  const remoteListing = { id: 'l1', area: 50, price: 100000, remote: true, promoted: true, promotedUntil: '2026-01-02T05:30:00.000Z' };

  it('shows the active status and blocks the click while promoted and not yet expired', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', now: () => new Date('2026-01-01T00:00:00.000Z').getTime() });
    const r = listingRow(remoteListing, deps);
    expect(r.vipActive()).toBe(true);
    expect(r.vipDisabled()).toBe(true);
    expect(r.vipLabel()).toBe('vipActive');
    expect(r.vipTimeLabel()).toBe('vipLeftDays:{"d":1,"h":5}');
    r.onVip();
    expect(deps.activateVip).not.toHaveBeenCalled();
  });

  it('switches to hours once under a day remains', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', now: () => new Date('2026-01-02T00:15:00.000Z').getTime() });
    const r = listingRow(remoteListing, deps);
    expect(r.vipTimeLabel()).toBe('vipLeftHours:{"h":5,"m":15}');
  });

  it('switches to minutes once under an hour remains', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', now: () => new Date('2026-01-02T05:10:00.000Z').getTime() });
    const r = listingRow(remoteListing, deps);
    expect(r.vipTimeLabel()).toBe('vipLeftMinutes:{"m":20}');
  });

  it('falls back to the promote button once promotedUntil has passed', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', now: () => new Date('2026-01-03T00:00:00.000Z').getTime() });
    const r = listingRow(remoteListing, deps);
    expect(r.vipActive()).toBe(false);
    expect(r.vipDisabled()).toBe(false);
    expect(r.vipLabel()).toBe('vipPromoteCost:{"cost":100}');
  });

  it('falls back to the promote button when promotedUntil is not a valid date', () => {
    const deps = makeDeps({ statusOf: () => 'fresh' });
    const r = listingRow({ ...remoteListing, promotedUntil: 'not-a-date' }, deps);
    expect(r.vipActive()).toBe(false);
    expect(r.vipLabel()).toBe('vipPromoteCost:{"cost":100}');
  });
});

describe('listingRow remote confirm state', () => {
  const remoteListing = { id: 'l1', area: 50, price: 100000, remote: true };

  it('derives confirmed from server-side hours instead of the local confirmed map', () => {
    const r = listingRow(remoteListing, makeDeps({ statusOf: () => 'fresh', hoursOf: () => 0, isConfirmed: () => false }));
    expect(r.done()).toBe(true);
    expect(r.btnLabel()).toBe('actConfirmed');
  });

  it('ignores a stale local confirmed flag once server hours have moved on', () => {
    const r = listingRow(remoteListing, makeDeps({ statusOf: () => 'fresh', hoursOf: () => 5, isConfirmed: () => true }));
    expect(r.done()).toBe(false);
    expect(r.btnLabel()).toBe('actConfirm');
  });

  it('shows a busy confirming label and blocks a second click while pending', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', hoursOf: () => 5, isConfirmBusy: () => true });
    const r = listingRow(remoteListing, deps);
    expect(r.btnLabel()).toBe('actConfirming');
    expect(r.btnBg()).toBe('SOFT');
    r.act();
    r.act();
    expect(deps.confirmBySms).not.toHaveBeenCalled();
  });

  it('confirms once when not busy and not yet confirmed', () => {
    const deps = makeDeps({ statusOf: () => 'fresh', hoursOf: () => 5, isConfirmBusy: () => false });
    const r = listingRow(remoteListing, deps);
    r.act();
    expect(deps.confirmBySms).toHaveBeenCalledWith('l1');
  });
});
