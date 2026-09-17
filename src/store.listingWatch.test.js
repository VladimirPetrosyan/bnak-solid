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
const { watchListing, clearListingWatch } = await import('./realtime');
const { state, setState, openListing, go, loadRemoteListings, restoreSession, requireAuth, loginWithPassword } = await import('./store');

function remoteItem(id) {
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
    owner: {}
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue([]);
  api.post.mockResolvedValue({});
  setState({
    user: null,
    token: null,
    screen: 'search',
    active: 'r1',
    remoteListings: [],
    myRemote: [],
    remoteFavorites: [],
    auth: { step: 'entry', country: 'AM', phone: '', code: '', password: '', role: 'tenant', name: '', forgot: false, after: null }
  });
});

describe('listing watch sync', () => {
  it('does not watch a demo (non-remote) listing', () => {
    openListing('r1');
    expect(watchListing).not.toHaveBeenCalled();
    expect(clearListingWatch).toHaveBeenCalled();
  });

  it('restore with late load: watches the already-open remote listing once remoteListings arrives', async () => {
    setState({ screen: 'listing', active: 'L1' });
    let resolveGet;
    api.get.mockImplementation((path) =>
      path.startsWith('/api/listings?') ? new Promise((res) => (resolveGet = res)) : Promise.resolve([])
    );

    const pending = loadRemoteListings();
    expect(watchListing).not.toHaveBeenCalled();

    resolveGet([remoteItem('L1')]);
    await pending;

    expect(watchListing).toHaveBeenCalledWith('L1');
  });

  it('phone after-auth flow watches the target remote listing once login completes', async () => {
    setState({ remoteListings: [remoteItem('L1')] });
    requireAuth({ type: 'phone', id: 'L1' });
    setState('auth', { phone: '55000000', password: 'x' });
    api.post.mockImplementation((path) =>
      path === '/api/auth/login' ? Promise.resolve({ token: 'tok', user: { id: 'u1', role: 'tenant', phone: '' } }) : Promise.resolve({})
    );

    await loginWithPassword();

    expect(state.screen).toBe('listing');
    expect(watchListing).toHaveBeenCalledWith('L1');
  });

  it('report after-auth flow watches the target remote listing once login completes', async () => {
    setState({ remoteListings: [remoteItem('L1')] });
    requireAuth({ type: 'report', id: 'L1' });
    setState('auth', { phone: '55000000', password: 'x' });
    api.post.mockImplementation((path) =>
      path === '/api/auth/login' ? Promise.resolve({ token: 'tok', user: { id: 'u1', role: 'tenant', phone: '' } }) : Promise.resolve({})
    );

    await loginWithPassword();

    expect(state.screen).toBe('listing');
    expect(watchListing).toHaveBeenCalledWith('L1');
  });

  it('clears the watch when navigating away from the listing screen', () => {
    setState({ screen: 'listing', active: 'L1', remoteListings: [remoteItem('L1')] });
    go('search');
    expect(clearListingWatch).toHaveBeenCalled();
  });

  it('does not touch the watch when navigating between two non-listing screens', () => {
    setState({ screen: 'search' });
    go('cabinet');
    expect(watchListing).not.toHaveBeenCalled();
    expect(clearListingWatch).not.toHaveBeenCalled();
  });

  it('switching from listing A to listing B watches B, not A a second time', () => {
    setState({ remoteListings: [remoteItem('A'), remoteItem('B')] });

    openListing('A');
    expect(watchListing).toHaveBeenLastCalledWith('A');

    openListing('B');
    expect(watchListing.mock.calls.map((c) => c[0])).toEqual(['A', 'B']);
  });
});
