import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(code, status) {
      super(code);
      this.code = code;
      this.status = status;
    }
  }
  return {
    api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn(), upload: vi.fn(), blob: vi.fn() },
    setAuthToken: vi.fn(),
    getAuthToken: vi.fn(),
    setApiLang: vi.fn(),
    fileURL: (p) => p,
    ApiError
  };
});

vi.mock('./realtime', () => ({
  connectRealtime: vi.fn(),
  disconnectRealtime: vi.fn(),
  watchListing: vi.fn(),
  clearListingWatch: vi.fn()
}));

class MemoryStorage {
  constructor() {
    this.data = {};
  }
  getItem(k) {
    return k in this.data ? this.data[k] : null;
  }
  setItem(k, v) {
    this.data[k] = String(v);
  }
  removeItem(k) {
    delete this.data[k];
  }
}

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {}, location: { pathname: '/' } };
globalThis.localStorage = globalThis.localStorage || new MemoryStorage();

const { api } = await import('./api');
const { connectRealtime } = await import('./realtime');
const { state, setState, restoreSession, loadExchangeRates, usdOf, rubOf, exchangeRateDateLabel, exchangeRateIsStale } =
  await import('./store');
const { nf } = await import('./data');
const { amdToForeign } = await import('./exchangeRates');

function ratesPayload(overrides = {}) {
  return {
    usd: { amount: 1, rate: 365.38 },
    rub: { amount: 1, rate: 4.3633 },
    publishedAt: '2026-08-24T00:00:00Z',
    updatedAt: '2026-08-24T10:00:00Z',
    ...overrides
  };
}

function emit(type, data) {
  const handlers = connectRealtime.mock.calls.at(-1)[0];
  handlers.onMessage(type, data);
}

const listing = { id: 'L1', price: 365380 };

function expectedUsd(price, rate) {
  return '≈ $' + nf(amdToForeign(price, rate));
}

function expectedRub(price, rate) {
  return '≈ ₽' + nf(amdToForeign(price, rate));
}

beforeEach(async () => {
  vi.clearAllMocks();
  api.get.mockImplementation((path) =>
    path === '/api/me' ? Promise.resolve({ id: 'u1', role: 'tenant', phone: '' }) : Promise.resolve([])
  );
  api.post.mockResolvedValue({});
  setState({ user: null, token: null, exchangeRates: null });
});

describe('loading the public exchange rate snapshot', () => {
  it('loads for a guest with no token', async () => {
    api.get.mockImplementation((path) => (path === '/api/exchange-rates' ? Promise.resolve(ratesPayload()) : Promise.resolve([])));
    await restoreSession();
    expect(state.exchangeRates.usd.rate).toBe(365.38);
    expect(usdOf(listing)).toBe(expectedUsd(listing.price, { amount: 1, rate: 365.38 }));
  });

  it('leaves the page usable without a snapshot on a 503', async () => {
    api.get.mockImplementation((path) => (path === '/api/exchange-rates' ? Promise.reject(new Error('503')) : Promise.resolve([])));
    await restoreSession();
    expect(state.exchangeRates).toBeNull();
    expect(usdOf(listing)).toBe('');
    expect(rubOf(listing)).toBe('');
    expect(exchangeRateDateLabel()).toBe('');
  });

  it('ignores a malformed REST payload without touching prior state', async () => {
    setState('exchangeRates', {
      usd: { amount: 1, rate: 365.38 },
      rub: { amount: 1, rate: 4.3633 },
      publishedAt: Date.parse('2026-08-24T00:00:00Z'),
      updatedAt: Date.parse('2026-08-24T10:00:00Z')
    });
    api.get.mockImplementation((path) =>
      path === '/api/exchange-rates' ? Promise.resolve({ usd: { amount: -1, rate: 1 } }) : Promise.resolve([])
    );
    await loadExchangeRates();
    expect(state.exchangeRates.usd.rate).toBe(365.38);
  });
});

describe('exchange_rates.updated realtime event', () => {
  it('updates both AMD-derived sums reactively without a reload', async () => {
    setState({ user: { id: 'u1', role: 'tenant' }, token: 'tok' });
    await restoreSession();

    emit('exchange_rates.updated', ratesPayload());
    expect(usdOf(listing)).toBe(expectedUsd(listing.price, { amount: 1, rate: 365.38 }));
    expect(rubOf(listing)).toBe(expectedRub(listing.price, { amount: 1, rate: 4.3633 }));

    emit('exchange_rates.updated', ratesPayload({ usd: { amount: 1, rate: 400 }, updatedAt: '2026-08-24T11:00:00Z' }));
    expect(usdOf(listing)).toBe(expectedUsd(listing.price, { amount: 1, rate: 400 }));
  });

  it('ignores a malformed event without touching state', async () => {
    setState({ user: { id: 'u1', role: 'tenant' }, token: 'tok' });
    await restoreSession();
    emit('exchange_rates.updated', ratesPayload());
    const before = state.exchangeRates;

    emit('exchange_rates.updated', null);
    emit('exchange_rates.updated', {});
    emit('exchange_rates.updated', ratesPayload({ usd: { amount: 0, rate: 1 } }));

    expect(state.exchangeRates).toBe(before);
  });
});

describe('out-of-order REST and WS delivery', () => {
  it('a fresher WS event is not rolled back by a slower, older REST response', async () => {
    let resolveGet;
    api.get.mockImplementation((path) => (path === '/api/exchange-rates' ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));
    setState({ user: { id: 'u1', role: 'tenant' }, token: 'tok' });

    const pending = restoreSession();
    await vi.waitFor(() => expect(connectRealtime).toHaveBeenCalled());
    emit('exchange_rates.updated', ratesPayload({ usd: { amount: 1, rate: 400 }, updatedAt: '2026-08-24T12:00:00Z' }));
    expect(state.exchangeRates.usd.rate).toBe(400);

    resolveGet(ratesPayload({ updatedAt: '2026-08-24T10:00:00Z' }));
    await pending;

    expect(state.exchangeRates.usd.rate).toBe(400);
  });

  it('a REST response newer than the current WS state still applies', async () => {
    let resolveGet;
    api.get.mockImplementation((path) => (path === '/api/exchange-rates' ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));
    setState({ user: { id: 'u1', role: 'tenant' }, token: 'tok' });

    const pending = restoreSession();
    await vi.waitFor(() => expect(connectRealtime).toHaveBeenCalled());
    emit('exchange_rates.updated', ratesPayload({ usd: { amount: 1, rate: 400 }, updatedAt: '2026-08-24T09:00:00Z' }));
    expect(state.exchangeRates.usd.rate).toBe(400);

    resolveGet(ratesPayload({ usd: { amount: 1, rate: 500 }, updatedAt: '2026-08-24T13:00:00Z' }));
    await pending;

    expect(state.exchangeRates.usd.rate).toBe(500);
  });
});

describe('exchangeRateIsStale', () => {
  it('reflects the current snapshot publishedAt', async () => {
    api.get.mockImplementation((path) =>
      path === '/api/exchange-rates' ? Promise.resolve(ratesPayload({ publishedAt: '2000-01-01T00:00:00Z' })) : Promise.resolve([])
    );
    await restoreSession();
    expect(exchangeRateIsStale()).toBe(true);
  });
});
