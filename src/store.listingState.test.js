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

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {} };
globalThis.localStorage = globalThis.localStorage || new MemoryStorage();

const { api } = await import('./api');
const { connectRealtime } = await import('./realtime');
const {
  state,
  setState,
  restoreSession,
  byId,
  statusOf,
  hoursOf,
  loadRemoteListings,
  loadMyRemoteListings,
  loadFavoritesRemote,
  refreshListingDetail,
  signOut
} = await import('./store');

function remoteItem(id, overrides = {}) {
  return {
    listing: {
      id,
      deal: 'rent',
      city: 'yerevan',
      d: 'kentron',
      street: 'Test str',
      price: 100000,
      rooms: 2,
      area: 50,
      fl: 2,
      fls: 5,
      status: 'active',
      ownerId: 'owner1',
      photos: [],
      confirmedAt: '2026-08-20T00:00:00.000Z',
      expiresAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-20T00:00:00.000Z',
      ...overrides
    },
    owner: { name: 'Owner' }
  };
}

function emit(type, data) {
  const handlers = connectRealtime.mock.calls.at(-1)[0];
  handlers.onMessage(type, data);
}

beforeEach(async () => {
  vi.clearAllMocks();
  api.get.mockImplementation((path) =>
    path === '/api/me' ? Promise.resolve({ id: 'u1', role: 'tenant', phone: '' }) : Promise.resolve([])
  );
  api.post.mockResolvedValue({});
  setState({ user: { id: 'me', role: 'tenant' }, favs: {}, token: 'tok', remoteListings: [], myRemote: [], remoteFavorites: [] });
  await restoreSession();
});

describe('listing.state realtime event', () => {
  it('patches status/confirmedAt/expiresAt/updatedAt across all three collections', () => {
    setState({
      remoteListings: [remoteItem('SL1')],
      myRemote: [remoteItem('SL1')],
      remoteFavorites: [remoteItem('SL1')]
    });

    emit('listing.state', {
      listingId: 'SL1',
      status: 'flagged',
      confirmedAt: '2026-08-20T00:00:00.000Z',
      expiresAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-25T01:00:00.000Z'
    });

    for (const list of [state.remoteListings, state.myRemote, state.remoteFavorites]) {
      expect(list[0].listing.status).toBe('flagged');
      expect(list[0].listing.updatedAt).toBe('2026-08-25T01:00:00.000Z');
    }
  });

  it('reactively changes byId/statusOf/hoursOf without a reload', () => {
    const stale = new Date(Date.now() - 60 * 3600000).toISOString();
    setState({ remoteListings: [remoteItem('SL2', { confirmedAt: stale })], myRemote: [], remoteFavorites: [] });
    expect(statusOf(byId('SL2'))).toBe('fresh');
    expect(hoursOf(byId('SL2'))).toBeGreaterThan(50);

    const fresh = new Date(Date.now() - 2 * 3600000).toISOString();
    emit('listing.state', {
      listingId: 'SL2',
      status: 'rented',
      confirmedAt: fresh,
      expiresAt: new Date(Date.now() + 70 * 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(statusOf(byId('SL2'))).toBe('archived');
    expect(hoursOf(byId('SL2'))).toBeLessThan(3);
  });

  it('ignores malformed, unknown-status or missing-id events', () => {
    setState({ remoteListings: [remoteItem('SL3')], myRemote: [], remoteFavorites: [] });

    emit('listing.state', null);
    emit('listing.state', {});
    emit('listing.state', { listingId: 123, status: 'active', updatedAt: '2026-08-25T00:00:00.000Z' });
    emit('listing.state', { listingId: 'SL3', status: 'deleted', updatedAt: '2026-08-25T00:00:00.000Z' });
    emit('listing.state', { listingId: 'SL3', status: 'active', updatedAt: 'not-a-date' });
    emit('listing.state', { listingId: 'SL3', status: 'active', updatedAt: '2026-08-25T00:00:00.000Z', confirmedAt: 'garbage' });

    expect(state.remoteListings[0].listing.status).toBe('active');
    expect(state.remoteListings[0].listing.updatedAt).toBe('2026-08-20T00:00:00.000Z');
  });

  it('ignores an older event delivered out of order after a newer one', () => {
    setState({ remoteListings: [remoteItem('SL4')], myRemote: [], remoteFavorites: [] });

    emit('listing.state', {
      listingId: 'SL4',
      status: 'archived',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T10:00:00.000Z'
    });
    emit('listing.state', {
      listingId: 'SL4',
      status: 'active',
      confirmedAt: '2026-08-20T00:00:00.000Z',
      expiresAt: '2026-08-23T00:00:00.000Z',
      updatedAt: '2026-08-25T09:00:00.000Z'
    });

    expect(state.remoteListings[0].listing.status).toBe('archived');
  });

  it('applying the same updatedAt twice is idempotent', () => {
    setState({ remoteListings: [remoteItem('SL5')], myRemote: [], remoteFavorites: [] });
    const data = { listingId: 'SL5', status: 'flagged', confirmedAt: null, expiresAt: null, updatedAt: '2026-08-25T10:00:00.000Z' };

    emit('listing.state', data);
    emit('listing.state', data);

    expect(state.remoteListings[0].listing.status).toBe('flagged');
  });

  it('accepts a null confirmedAt/expiresAt', () => {
    setState({ remoteListings: [remoteItem('SL6')], myRemote: [], remoteFavorites: [] });

    emit('listing.state', {
      listingId: 'SL6',
      status: 'pending',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T10:00:00.000Z'
    });

    expect(state.remoteListings[0].listing.confirmedAt).toBeNull();
    expect(state.remoteListings[0].listing.expiresAt).toBeNull();
  });

  it('leaves a listing missing from a given collection untouched there', () => {
    setState({ remoteListings: [remoteItem('SL7')], myRemote: [], remoteFavorites: [] });

    emit('listing.state', {
      listingId: 'SL7',
      status: 'flagged',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T10:00:00.000Z'
    });

    expect(state.myRemote).toEqual([]);
    expect(state.remoteFavorites).toEqual([]);
  });

  it('does not affect a listing.stats patch on the same listing and vice versa', () => {
    setState({ remoteListings: [remoteItem('SL8', { views: 5, favorites: 2 })], myRemote: [], remoteFavorites: [] });

    emit('listing.stats', { listingId: 'SL8', views: 9 });
    emit('listing.state', {
      listingId: 'SL8',
      status: 'flagged',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T10:00:00.000Z'
    });

    expect(state.remoteListings[0].views).toBe(9);
    expect(state.remoteListings[0].listing.status).toBe('flagged');
  });
});

describe('late REST responses vs a fresher WS state event', () => {
  it('a stale /api/listings response cannot roll back a newer WS status', async () => {
    setState({ remoteListings: [remoteItem('SL9')], myRemote: [], remoteFavorites: [] });
    let resolveGet;
    api.get.mockImplementation((path) => (path.startsWith('/api/listings?') ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));

    const pending = loadRemoteListings();
    emit('listing.state', {
      listingId: 'SL9',
      status: 'archived',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T12:00:00.000Z'
    });

    resolveGet([remoteItem('SL9', { status: 'active', updatedAt: '2026-08-20T00:00:00.000Z' })]);
    await pending;

    expect(state.remoteListings[0].listing.status).toBe('archived');
  });

  it('a fresher /api/listings/mine response wins over an older cached WS state', async () => {
    setState({ myRemote: [remoteItem('SL10')], remoteListings: [], remoteFavorites: [] });

    emit('listing.state', {
      listingId: 'SL10',
      status: 'flagged',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T08:00:00.000Z'
    });
    expect(state.myRemote[0].listing.status).toBe('flagged');

    api.get.mockResolvedValueOnce([remoteItem('SL10', { status: 'active', updatedAt: '2026-08-25T09:00:00.000Z' })]);
    await loadMyRemoteListings();

    expect(state.myRemote[0].listing.status).toBe('active');
  });

  it('a late detail GET does not roll back a newer mutation', async () => {
    setState({ remoteListings: [remoteItem('SL11')], myRemote: [], remoteFavorites: [] });
    let resolveGet;
    api.get.mockImplementation((path) => (path.startsWith('/api/listings/') ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));

    const pending = refreshListingDetail('SL11');
    emit('listing.state', {
      listingId: 'SL11',
      status: 'rented',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T12:00:00.000Z'
    });

    resolveGet(remoteItem('SL11', { status: 'active', updatedAt: '2026-08-20T00:00:00.000Z' }));
    await pending;

    expect(byId('SL11').backendStatus).toBe('rented');
  });

  it('a late /api/favorites response does not roll back a newer WS state', async () => {
    setState({ remoteFavorites: [remoteItem('SL12')], remoteListings: [], myRemote: [] });
    let resolveGet;
    api.get.mockImplementation((path) => (path === '/api/favorites' ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));

    const pending = loadFavoritesRemote();
    emit('listing.state', {
      listingId: 'SL12',
      status: 'archived',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T12:00:00.000Z'
    });

    resolveGet([remoteItem('SL12', { status: 'active', updatedAt: '2026-08-20T00:00:00.000Z' })]);
    await pending;

    expect(state.remoteFavorites[0].listing.status).toBe('archived');
  });

  it('an older WS event after a newer REST baseline is ignored', async () => {
    setState({ remoteListings: [], myRemote: [], remoteFavorites: [] });
    api.get.mockResolvedValueOnce([remoteItem('SL13', { status: 'active', updatedAt: '2026-08-25T09:00:00.000Z' })]);
    await loadRemoteListings();

    emit('listing.state', {
      listingId: 'SL13',
      status: 'archived',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T08:00:00.000Z'
    });

    expect(state.remoteListings[0].listing.status).toBe('active');
  });

  it('a conflicting payload with an equal timestamp does not override state, from WS or REST', async () => {
    setState({
      remoteListings: [remoteItem('SL14', { status: 'active', updatedAt: '2026-08-25T10:00:00.000Z' })],
      myRemote: [],
      remoteFavorites: []
    });

    emit('listing.state', {
      listingId: 'SL14',
      status: 'flagged',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T10:00:00.000Z'
    });
    expect(state.remoteListings[0].listing.status).toBe('active');

    api.get.mockResolvedValueOnce([remoteItem('SL14', { status: 'rented', updatedAt: '2026-08-25T10:00:00.000Z' })]);
    await loadRemoteListings();

    expect(state.remoteListings[0].listing.status).toBe('active');
  });

  it('uses the newest known updatedAt across all three collections as the baseline', () => {
    setState({
      remoteListings: [remoteItem('SL15', { status: 'active', updatedAt: '2026-08-25T08:00:00.000Z' })],
      myRemote: [],
      remoteFavorites: [remoteItem('SL15', { status: 'flagged', updatedAt: '2026-08-25T11:00:00.000Z' })]
    });

    emit('listing.state', {
      listingId: 'SL15',
      status: 'rented',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T09:00:00.000Z'
    });

    expect(state.remoteListings[0].listing.status).toBe('active');
    expect(state.remoteFavorites[0].listing.status).toBe('flagged');
  });
});

describe('stateCache lifecycle', () => {
  it('clears stateCache on sign-out so a later reload is not shadowed by a stale session cache', async () => {
    setState({
      remoteListings: [],
      myRemote: [remoteItem('SL16', { status: 'active', updatedAt: '2026-08-20T00:00:00.000Z' })],
      remoteFavorites: []
    });

    emit('listing.state', {
      listingId: 'SL16',
      status: 'archived',
      confirmedAt: null,
      expiresAt: null,
      updatedAt: '2026-08-25T10:00:00.000Z'
    });
    expect(state.myRemote[0].listing.status).toBe('archived');

    signOut();
    setState({ user: { id: 'me', role: 'tenant' }, token: 'tok' });

    api.get.mockResolvedValueOnce([remoteItem('SL16', { status: 'active', updatedAt: '2026-08-20T00:00:00.000Z' })]);
    await loadMyRemoteListings();

    expect(state.myRemote[0].listing.status).toBe('active');
  });
});
