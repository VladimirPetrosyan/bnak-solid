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
const { state, setState, restoreSession, toggleFav, byId, refreshListingDetail, loadFavoritesRemote } = await import('./store');
const { favoritesOf } = await import('./listingStats');

function remoteItem(id, extra = {}) {
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
      photos: []
    },
    owner: { name: 'Owner' },
    views: 5,
    favorites: 2,
    ...extra
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

describe('listing.stats realtime event', () => {
  it('patches absolute views/favorites reactively across remoteListings, myRemote and remoteFavorites', () => {
    setState({
      remoteListings: [remoteItem('L1')],
      myRemote: [remoteItem('L1')],
      remoteFavorites: [remoteItem('L1')]
    });

    emit('listing.stats', { listingId: 'L1', views: 41, favorites: 9 });

    expect(state.remoteListings[0].views).toBe(41);
    expect(state.remoteListings[0].favorites).toBe(9);
    expect(state.myRemote[0].views).toBe(41);
    expect(state.myRemote[0].favorites).toBe(9);
    expect(state.remoteFavorites[0].views).toBe(41);
    expect(state.remoteFavorites[0].favorites).toBe(9);
  });

  it('leaves an omitted field and unrelated data untouched', () => {
    setState({ remoteListings: [remoteItem('L1', { views: 5, favorites: 2 })], myRemote: [], remoteFavorites: [] });

    emit('listing.stats', { listingId: 'L1', views: 12 });

    const row = state.remoteListings[0];
    expect(row.views).toBe(12);
    expect(row.favorites).toBe(2);
    expect(row.owner.name).toBe('Owner');
    expect(row.listing.price).toBe(100000);
  });

  it('ignores malformed or negative events without touching state', () => {
    const before = [remoteItem('L1', { views: 5, favorites: 2 })];
    setState({ remoteListings: before, myRemote: [], remoteFavorites: [] });

    emit('listing.stats', null);
    emit('listing.stats', {});
    emit('listing.stats', { listingId: 123, views: 9 });
    emit('listing.stats', { listingId: 'L1', views: -1 });
    emit('listing.stats', { listingId: 'L1', favorites: -1 });
    emit('listing.stats', { listingId: 'unknown-id', views: 9 });

    expect(state.remoteListings[0].views).toBe(5);
    expect(state.remoteListings[0].favorites).toBe(2);
  });

  it('does not sum with a REST toggleFav response when the WS event lands first', async () => {
    setState({ remoteListings: [remoteItem('L1', { favorites: 2 })], myRemote: [], remoteFavorites: [] });

    emit('listing.stats', { listingId: 'L1', favorites: 5 });
    expect(state.remoteListings[0].favorites).toBe(5);

    api.post.mockResolvedValueOnce({ ok: true, favorites: 3 });
    await toggleFav('L1');
    expect(state.remoteListings[0].favorites).toBe(3);
  });

  it('does not sum with a REST toggleFav response when the WS event lands second', async () => {
    setState({ remoteListings: [remoteItem('L1', { favorites: 2 })], myRemote: [], remoteFavorites: [] });

    api.post.mockResolvedValueOnce({ ok: true, favorites: 3 });
    await toggleFav('L1');
    expect(state.remoteListings[0].favorites).toBe(3);

    emit('listing.stats', { listingId: 'L1', favorites: 5 });
    expect(state.remoteListings[0].favorites).toBe(5);
  });
});

describe('displayed favorites count on the listing screen', () => {
  it('changes immediately after add and after remove, without a reload', async () => {
    setState({ remoteListings: [remoteItem('L1', { favorites: 2 })], myRemote: [], remoteFavorites: [] });

    api.post.mockResolvedValueOnce({ ok: true, favorites: 3 });
    await toggleFav('L1');
    expect(favoritesOf(byId('L1'))).toBe(3);

    api.del.mockResolvedValueOnce({ ok: true, favorites: 2 });
    await toggleFav('L1');
    expect(favoritesOf(byId('L1'))).toBe(2);
  });

  it('a stale /api/favorites response does not override a fresher favorites count from a WS event', async () => {
    setState({ remoteListings: [remoteItem('L1', { favorites: 2 })], myRemote: [], remoteFavorites: [] });
    let resolveGet;
    api.get.mockImplementation((path) => (path === '/api/favorites' ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));

    const pending = loadFavoritesRemote();
    emit('listing.stats', { listingId: 'L1', favorites: 9 });
    expect(favoritesOf(byId('L1'))).toBe(9);

    resolveGet([remoteItem('L1', { favorites: 2 })]);
    await pending;

    expect(state.remoteFavorites[0].favorites).toBe(9);
    expect(favoritesOf(byId('L1'))).toBe(9);
  });

  it('a late detail GET response does not roll back a newer mutation', async () => {
    setState({ remoteListings: [remoteItem('L1', { favorites: 2 })], myRemote: [], remoteFavorites: [] });
    let resolveGet;
    api.get.mockImplementation((path) => (path.startsWith('/api/listings/') ? new Promise((r) => (resolveGet = r)) : Promise.resolve([])));

    const pending = refreshListingDetail('L1');
    api.post.mockResolvedValueOnce({ ok: true, favorites: 9 });
    await toggleFav('L1');
    expect(favoritesOf(byId('L1'))).toBe(9);

    resolveGet(remoteItem('L1', { favorites: 2 }));
    await pending;

    expect(favoritesOf(byId('L1'))).toBe(9);
  });
});
