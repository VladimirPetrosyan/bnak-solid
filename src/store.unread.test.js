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
    setApiLang: vi.fn(),
    getAuthToken: vi.fn(),
    fileURL: (p) => p,
    ApiError,
    API_BASE: 'http://localhost:8080'
  };
});

vi.mock('./realtime', () => ({
  connectRealtime: vi.fn(),
  disconnectRealtime: vi.fn()
}));

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {}, location: { pathname: '/' } };
globalThis.localStorage = globalThis.localStorage || {
  data: {},
  getItem(k) {
    return k in this.data ? this.data[k] : null;
  },
  setItem(k, v) {
    this.data[k] = String(v);
  },
  removeItem(k) {
    delete this.data[k];
  }
};

const { api } = await import('./api');
const { state, setState, openThread, markThreadSeen, unreadCountOf, unreadTotal, loadThreadsRemote } = await import(
  './store'
);

function remoteThread(overrides) {
  return { remote: true, listing: 'L1', other: { id: 'owner1', name: 'Owner' }, msgs: [], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  api.get.mockResolvedValue([]);
  api.post.mockResolvedValue({ ok: true });
  setState({ user: { id: 'me', role: 'tenant' }, token: 'tok', threads: {}, unread: {}, thread: null, chatAtBottom: true });
});

describe('unreadCountOf', () => {
  it('returns the exact number, never clamping a positive count to 1', () => {
    expect(unreadCountOf(4)).toBe(4);
    expect(unreadCountOf(100)).toBe(100);
  });

  it('treats missing/non-numeric values as 0', () => {
    expect(unreadCountOf(undefined)).toBe(0);
    expect(unreadCountOf(null)).toBe(0);
    expect(unreadCountOf('nope')).toBe(0);
  });

  it('never returns a negative count', () => {
    expect(unreadCountOf(-5)).toBe(0);
  });
});

describe('unreadTotal', () => {
  it('is the count of dialogs with unread messages, not the sum of messages', () => {
    setState('unread', { stepa: 4, anna: 7, ivan: 0 });
    expect(unreadTotal()).toBe(2);
  });

  it('is 1 for a single dialog no matter how many unread messages it has', () => {
    setState('unread', { stepa: 100 });
    expect(unreadTotal()).toBe(1);
  });
});

describe('openThread', () => {
  it('does not clear unread synchronously — only markThreadSeen (bottom-confirmed) does', () => {
    setState('threads', { th1: remoteThread() });
    setState('unread', { th1: 4 });
    openThread('th1');
    expect(state.unread.th1).toBe(4);
  });

  it('resets chatAtBottom to false until the UI confirms the user reached the bottom', () => {
    setState('threads', { th1: remoteThread() });
    setState('chatAtBottom', true);
    openThread('th1');
    expect(state.chatAtBottom).toBe(false);
  });
});

describe('markThreadSeen', () => {
  it('clears the local badge immediately (optimistic)', () => {
    setState('unread', { th1: 4 });
    markThreadSeen('th1');
    expect(state.unread.th1).toBeUndefined();
  });

  it('debounces the backend call across rapid repeated calls for the same thread', async () => {
    vi.useFakeTimers();
    markThreadSeen('th1');
    markThreadSeen('th1');
    markThreadSeen('th1');
    expect(api.post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/api/threads/th1/read');
  });

  it('routes the support key to /api/support/read', async () => {
    vi.useFakeTimers();
    markThreadSeen('support');
    await vi.advanceTimersByTimeAsync(300);
    expect(api.post).toHaveBeenCalledWith('/api/support/read');
  });
});

describe('loadThreadsRemote race with a pending mark-read', () => {
  it('does not let a slower GET /threads resurrect unread that was just cleared locally', async () => {
    vi.useFakeTimers();
    setState('threads', { th1: remoteThread() });
    setState('unread', { th1: 4 });

    let resolveGet;
    api.get.mockReturnValue(
      new Promise((res) => {
        resolveGet = res;
      })
    );

    markThreadSeen('th1'); // пользователь долистал до низа — локально прочитано, POST ещё не улетел (debounce)

    const pending = loadThreadsRemote(); // например, параллельный фоновый рефреш
    resolveGet([{ thread: { id: 'th1' }, listingId: 'L1', other: {}, unread: 4 }]); // backend ещё не увидел POST /read
    await pending;

    expect(state.unread.th1).toBeUndefined();

    await vi.advanceTimersByTimeAsync(300); // дать debounced POST /read завершиться
  });

  it('trusts the next GET /threads once the pending mark-read has resolved', async () => {
    vi.useFakeTimers();
    setState('threads', { th1: remoteThread() });
    setState('unread', { th1: 4 });

    markThreadSeen('th1');
    await vi.advanceTimersByTimeAsync(300);

    api.get.mockResolvedValue([{ thread: { id: 'th1' }, listingId: 'L1', other: {}, unread: 2 }]);
    await loadThreadsRemote();

    expect(state.unread.th1).toBe(2);
  });
});
