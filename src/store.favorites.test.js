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

const { api, ApiError } = await import('./api');
const { state, setState, toggleFav } = await import('./store');

function remoteListing(id, favorites) {
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
    owner: {},
    favorites
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setState({
    user: { id: 'me', role: 'tenant' },
    token: 'tok',
    favs: {},
    remoteListings: [remoteListing('L1', 0)],
    myRemote: [],
    remoteFavorites: []
  });
});

describe('toggleFav (remote listing)', () => {
  it('does not flip the flag until the API call succeeds', async () => {
    let resolveReq;
    api.post.mockReturnValueOnce(new Promise((r) => (resolveReq = r)));

    const pending = toggleFav('L1');
    expect(state.favs.L1).toBeFalsy();

    resolveReq({ ok: true, favorites: 1 });
    await pending;
    expect(state.favs.L1).toBe(true);
    expect(state.remoteListings[0].favorites).toBe(1);
  });

  it('leaves no false flag or count on failure, and reports the error', async () => {
    api.post.mockRejectedValueOnce(new ApiError('db error', 500));

    await toggleFav('L1');

    expect(state.favs.L1).toBeFalsy();
    expect(state.remoteListings[0].favorites).toBe(0);
    expect(state.toast).toBeTruthy();
  });

  it('ignores a rapid repeated click while a request is in flight', async () => {
    let resolveReq;
    api.post.mockReturnValueOnce(new Promise((r) => (resolveReq = r)));

    const pending = toggleFav('L1');
    toggleFav('L1');
    toggleFav('L1');
    expect(api.post).toHaveBeenCalledTimes(1);

    resolveReq({ ok: true, favorites: 1 });
    await pending;
    expect(state.favs.L1).toBe(true);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('allows toggling again once the previous request has settled', async () => {
    api.post.mockResolvedValueOnce({ ok: true, favorites: 1 });
    await toggleFav('L1');
    expect(state.favs.L1).toBe(true);

    api.del.mockResolvedValueOnce({ ok: true, favorites: 0 });
    await toggleFav('L1');
    expect(state.favs.L1).toBeFalsy();
    expect(state.remoteListings[0].favorites).toBe(0);
  });
});
