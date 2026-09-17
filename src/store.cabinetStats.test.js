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
const { state, setState, myItems, byId, refreshListingDetail, toggleFav } = await import('./store');

function listing(id, overrides = {}) {
  return {
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
    ownerId: 'me',
    photos: [],
    ...overrides
  };
}

function remoteItem(id, extra = {}) {
  return { listing: listing(id), owner: {}, ...extra };
}

beforeEach(() => {
  vi.clearAllMocks();
  setState({
    user: { id: 'me', role: 'owner' },
    token: 'tok',
    favs: {},
    remoteListings: [],
    myRemote: [remoteItem('L1')],
    remoteFavorites: []
  });
});

describe('myItems merges freshest known stats', () => {
  it('keeps detail-loaded views/favorites when /mine has not caught up yet', () => {
    setState('remoteListings', [remoteItem('L1', { views: 10, favorites: 4 })]);
    const [row] = myItems();
    expect(row.views).toBe(10);
    expect(row.favorites).toBe(4);
  });

  it('applies fresher stats once /mine returns them', () => {
    setState('remoteListings', [remoteItem('L1', { views: 10, favorites: 4 })]);
    setState('myRemote', [remoteItem('L1', { views: 12, favorites: 5 })]);
    const [row] = myItems();
    expect(row.views).toBe(12);
    expect(row.favorites).toBe(5);
  });

  it('does not treat a real zero as missing', () => {
    setState('remoteListings', [remoteItem('L1', { views: 3, favorites: 3 })]);
    setState('myRemote', [remoteItem('L1', { views: 0, favorites: 0 })]);
    const [row] = myItems();
    expect(row.views).toBe(0);
    expect(row.favorites).toBe(0);
  });

  it('is empty for an anonymous user', () => {
    setState('user', null);
    expect(myItems()).toEqual([]);
  });
});

describe('refreshListingDetail updates views reactively', () => {
  it('updates byId and myItems from the same fetch without a reload', async () => {
    api.get.mockResolvedValueOnce(remoteItem('L1', { views: 10, favorites: 2 }));
    await refreshListingDetail('L1');

    expect(byId('L1').views).toBe(10);
    expect(myItems()[0].views).toBe(10);
  });
});

describe('toggleFav updates the cabinet view too', () => {
  it('patches myRemote favorites after a successful add', async () => {
    api.post.mockResolvedValueOnce({ ok: true, favorites: 6 });
    await toggleFav('L1');
    expect(state.myRemote[0].favorites).toBe(6);
    expect(myItems()[0].favorites).toBe(6);
  });
});
