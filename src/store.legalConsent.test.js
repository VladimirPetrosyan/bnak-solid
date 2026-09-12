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

const { api, ApiError } = await import('./api');
const { LEGAL_CONSENT_VERSION } = await import('./legalDocs');
const { state, setState, finishAuth, startRegistration, requireAuth, signOut, openLegal, legalBack, txt } = await import('./store');

function registrationState(overrides = {}) {
  return {
    step: 'role',
    country: 'AM',
    phone: '91234567',
    code: '1111',
    password: 'password1',
    role: 'owner',
    name: 'Ann',
    forgot: false,
    after: null,
    legalAccepted: true,
    busy: false,
    ...overrides
  };
}

function resetAuthState() {
  setState({
    screen: 'auth',
    user: null,
    token: null,
    auth: registrationState(),
    legalId: null,
    legalFrom: 'search'
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue([]);
  api.post.mockResolvedValue({ token: 'tok1', user: { id: 'u1', role: 'owner', phone: '91234567', name: 'Ann' } });
  resetAuthState();
});

describe('finishAuth payload', () => {
  it('sends acceptedLegal, the canonical legal version and the canonical language', async () => {
    setState('lang', 'RU');
    await finishAuth();
    expect(api.post).toHaveBeenCalledTimes(1);
    const [path, body] = api.post.mock.calls[0];
    expect(path).toBe('/api/auth/register');
    expect(body.acceptedLegal).toBe(true);
    expect(body.legalVersion).toBe(LEGAL_CONSENT_VERSION);
    expect(body.legalLanguage).toBe('ru');
  });

  it('maps ՀՅ/RU/EN to canonical hy/ru/en', async () => {
    for (const [lang, canonical] of [
      ['ՀՅ', 'hy'],
      ['RU', 'ru'],
      ['EN', 'en']
    ]) {
      resetAuthState();
      api.post.mockClear();
      setState('lang', lang);
      await finishAuth();
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post.mock.calls[0][1].legalLanguage).toBe(canonical);
    }
  });
});

describe('checkbox gating', () => {
  it('refuses to submit and shows a localized error when the checkbox is unchecked', async () => {
    setState('auth', 'legalAccepted', false);
    await finishAuth();
    expect(api.post).not.toHaveBeenCalled();
    expect(state.toast).toBe(txt('errLegalRequired'));
    expect(state.auth.step).toBe('role');
  });

  it('ignores a second call while a request is already in flight (double click / late response)', async () => {
    let resolveFirst;
    api.post.mockReturnValue(
      new Promise((resolve) => {
        resolveFirst = resolve;
      })
    );
    const first = finishAuth();
    expect(state.auth.busy).toBe(true);
    await finishAuth(); // second click while busy
    expect(api.post).toHaveBeenCalledTimes(1);
    resolveFirst({ token: 'tok1', user: { id: 'u1', role: 'owner' } });
    await first;
  });
});

describe('server-side rejection', () => {
  it('shows a localized error and stays on the role step without discarding entered data on "not accepted"', async () => {
    api.post.mockRejectedValue(new ApiError('legal not accepted', 400));
    await finishAuth();
    expect(state.toast).toBe(txt('errLegalRequired'));
    expect(state.auth.step).toBe('role');
    expect(state.auth.name).toBe('Ann');
    expect(state.auth.busy).toBe(false);
    expect(state.user).toBeNull();
  });

  it('shows a localized error on a legal version mismatch', async () => {
    api.post.mockRejectedValue(new ApiError('legal version outdated', 400));
    await finishAuth();
    expect(state.toast).toBe(txt('errLegalVersion'));
    expect(state.auth.step).toBe('role');
    expect(state.auth.busy).toBe(false);
  });
});

describe('consent reset points', () => {
  it('resets on a fresh registration start', () => {
    setState('auth', 'legalAccepted', true);
    startRegistration();
    expect(state.auth.legalAccepted).toBe(false);
    expect(state.auth.step).toBe('phone');
  });

  it('resets after a successful registration', async () => {
    await finishAuth();
    expect(state.auth.legalAccepted).toBe(false);
  });

  it('resets on sign out, clearing any stale local auth state', () => {
    setState({ user: { id: 'u1', role: 'tenant' }, token: 'tok1' });
    setState('auth', 'legalAccepted', true);
    signOut();
    expect(state.auth.legalAccepted).toBe(false);
  });

  it('resets when requireAuth redirects an unauthenticated user back to auth', () => {
    setState('auth', 'legalAccepted', true);
    setState('user', null);
    requireAuth({ type: 'go', to: 'search' });
    expect(state.auth.legalAccepted).toBe(false);
  });
});

describe('legal navigation roundtrip', () => {
  it('preserves the registration step and entered data when opening a linked document and coming back', () => {
    openLegal('terms');
    expect(state.screen).toBe('legal');
    expect(state.legalFrom).toBe('auth');
    expect(state.auth.step).toBe('role');
    expect(state.auth.name).toBe('Ann');
    expect(state.auth.legalAccepted).toBe(true);

    legalBack(); // doc -> list
    expect(state.screen).toBe('legal');
    legalBack(); // list -> auth
    expect(state.screen).toBe('auth');
    expect(state.auth.step).toBe('role');
    expect(state.auth.name).toBe('Ann');
    expect(state.auth.legalAccepted).toBe(true);
  });
});
