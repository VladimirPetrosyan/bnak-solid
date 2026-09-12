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
const { state, setState, confirmRemote, hoursOf, statusOf, byId } = await import('./store');

function remoteItem(id, { status = 'active', confirmedAt, pendingRevision = null } = {}) {
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
      status,
      ownerId: 'me',
      photos: [],
      confirmedAt: confirmedAt || new Date(Date.now() - 60 * 3600 * 1000).toISOString()
    },
    owner: {},
    pendingRevision
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setState({
    user: { id: 'me', role: 'owner' },
    token: 'tok',
    confirmed: {},
    confirmBusy: {},
    flagged: {},
    myRemote: [remoteItem('L1')]
  });
});

describe('confirmRemote', () => {
  it('renews the listing and derives the confirmed state from the fresh server dates', async () => {
    api.post.mockResolvedValueOnce({ ok: true });
    api.get.mockResolvedValueOnce([remoteItem('L1', { confirmedAt: new Date().toISOString() })]);

    await confirmRemote('L1');

    expect(api.post).toHaveBeenCalledWith('/api/listings/L1/confirm');
    expect(hoursOf(byId('L1'))).toBe(0);
    expect(state.toast).toBeTruthy();
    expect(state.confirmed.L1).toBeUndefined();
  });

  it('leaves the previous state untouched and reports the error on failure', async () => {
    api.post.mockRejectedValueOnce(new ApiError('db error', 500));

    await confirmRemote('L1');

    expect(statusOf(byId('L1'))).toBe('fresh');
    expect(hoursOf(byId('L1'))).toBe(60);
    expect(state.toast).toBeTruthy();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('ignores a rapid repeated click while a request is in flight', async () => {
    let resolveReq;
    api.post.mockReturnValueOnce(new Promise((r) => (resolveReq = r)));
    api.get.mockResolvedValueOnce([remoteItem('L1', { confirmedAt: new Date().toISOString() })]);

    const pending = confirmRemote('L1');
    confirmRemote('L1');
    confirmRemote('L1');
    expect(api.post).toHaveBeenCalledTimes(1);

    resolveReq({ ok: true });
    await pending;
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(hoursOf(byId('L1'))).toBe(0);
  });

  it('routes a flagged listing to /resolve instead of /confirm', async () => {
    setState('myRemote', [remoteItem('L2', { status: 'flagged' })]);
    api.post.mockResolvedValueOnce({ ok: true });
    api.get.mockResolvedValueOnce([remoteItem('L2', { confirmedAt: new Date().toISOString() })]);

    await confirmRemote('L2');

    expect(api.post).toHaveBeenCalledWith('/api/listings/L2/resolve');
  });
});

describe('server-date derived confirmation', () => {
  it('reflects the fresh confirmedAt after a simulated page reload, without any ephemeral flag', () => {
    setState('myRemote', [remoteItem('L3', { confirmedAt: new Date().toISOString() })]);
    expect(hoursOf(byId('L3'))).toBe(0);
    expect(statusOf(byId('L3'))).toBe('fresh');
  });
});
