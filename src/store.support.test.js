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
const { state, setState, threadsAll, SUPPORT_KEY, openThread, sendMsg, loadSupportMessages, receiveSupportMessage } =
  await import('./store');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  setState({
    user: { id: 'me', role: 'tenant' },
    token: 'tok',
    threads: {},
    unread: {},
    thread: null,
    chatAtBottom: true,
    draft: '',
    support: { messages: [], loading: false }
  });
});

describe('support pseudo-thread', () => {
  it('is absent for guests', () => {
    setState('user', null);
    expect(threadsAll()[SUPPORT_KEY]).toBeUndefined();
  });

  it('is pinned in the thread list for logged-in users', () => {
    const all = threadsAll();
    expect(all[SUPPORT_KEY]).toBeTruthy();
    expect(Object.keys(all)[0]).toBe(SUPPORT_KEY);
  });

  it('reflects state.support.messages as display messages', () => {
    setState('support', 'messages', [{ id: 1, sender: 'user', text: 'hi', createdAt: '2026-01-01T10:00:00Z' }]);
    const th = threadsAll()[SUPPORT_KEY];
    expect(th.msgs).toHaveLength(1);
    expect(th.msgs[0]).toMatchObject({ me: true, text: 'hi' });
  });

  it('opening it fetches /api/support/messages (not /api/threads) without marking it read upfront', async () => {
    api.get.mockResolvedValue([
      { id: 1, sender: 'admin', text: 'hi', readAt: null },
      { id: 2, sender: 'admin', text: 'there', readAt: null },
      { id: 3, sender: 'admin', text: '?', readAt: null }
    ]);
    api.post.mockResolvedValue({ ok: true });
    setState('unread', SUPPORT_KEY, 3);
    openThread(SUPPORT_KEY);
    // unread must survive until Chat.jsx confirms the user actually reached the bottom —
    // opening the thread alone must not clear it or call /read.
    expect(state.unread[SUPPORT_KEY]).toBe(3);
    expect(state.chatAtBottom).toBe(false);
    await Promise.resolve();
    await Promise.resolve();
    expect(api.get).toHaveBeenCalledWith('/api/support/messages');
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/threads'));
    expect(api.post).not.toHaveBeenCalledWith('/api/support/read');
    expect(state.unread[SUPPORT_KEY]).toBe(3);
  });

  it('sendMsg on the support thread posts to /api/support/messages', () => {
    setState('thread', SUPPORT_KEY);
    setState('draft', 'need help');
    api.post.mockResolvedValue({ id: 1, threadId: 't1', sender: 'user', text: 'need help', createdAt: '2026-01-01T10:00:00Z' });
    sendMsg();
    expect(api.post).toHaveBeenCalledWith('/api/support/messages', { kind: 'text', text: 'need help' });
    expect(state.draft).toBe('');
  });
});

describe('receiveSupportMessage', () => {
  it('appends an incoming admin reply and marks it unread when the thread is not open', () => {
    setState('thread', 'other');
    setState('screen', 'search');
    receiveSupportMessage({ message: { id: 1, sender: 'admin', text: 'hi', createdAt: '2026-01-01T10:00:00Z' } });
    expect(state.support.messages).toHaveLength(1);
    expect(state.unread[SUPPORT_KEY]).toBe(1);
  });

  it('increments the exact unread count instead of clamping it to 1', () => {
    setState('thread', 'other');
    setState('screen', 'search');
    receiveSupportMessage({ message: { id: 1, sender: 'admin', text: 'a' } });
    receiveSupportMessage({ message: { id: 2, sender: 'admin', text: 'b' } });
    receiveSupportMessage({ message: { id: 3, sender: 'admin', text: 'c' } });
    expect(state.unread[SUPPORT_KEY]).toBe(3);
  });

  it('does not set unread and schedules a debounced read call when the support thread is open at the bottom', async () => {
    vi.useFakeTimers();
    setState('screen', 'chat');
    setState('thread', SUPPORT_KEY);
    api.post.mockResolvedValue({ ok: true });
    receiveSupportMessage({ message: { id: 1, sender: 'admin', text: 'hi', createdAt: '2026-01-01T10:00:00Z' } });
    expect(state.unread[SUPPORT_KEY]).toBeUndefined();
    expect(api.post).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(api.post).toHaveBeenCalledWith('/api/support/read');
  });

  it('marks unread even when the support thread is open if scrolled away from the bottom', () => {
    setState('screen', 'chat');
    setState('thread', SUPPORT_KEY);
    setState('chatAtBottom', false);
    receiveSupportMessage({ message: { id: 1, sender: 'admin', text: 'hi' } });
    expect(state.unread[SUPPORT_KEY]).toBe(1);
  });

  it('does not mark unread for its own message echoed back', () => {
    setState('thread', 'other');
    setState('screen', 'search');
    receiveSupportMessage({ message: { id: 1, sender: 'user', text: 'hi' } });
    expect(state.unread[SUPPORT_KEY]).toBeUndefined();
  });

  it('dedupes by message id', () => {
    setState('support', 'messages', [{ id: 1, sender: 'admin', text: 'hi' }]);
    receiveSupportMessage({ message: { id: 1, sender: 'admin', text: 'hi' } });
    expect(state.support.messages).toHaveLength(1);
  });

  it('ignores malformed payloads without throwing', () => {
    expect(() => receiveSupportMessage(null)).not.toThrow();
    expect(() => receiveSupportMessage({})).not.toThrow();
  });
});

describe('loadSupportMessages', () => {
  it('reflects the exact number of unread admin replies, not just a boolean flag', async () => {
    api.get.mockResolvedValue([
      { id: 1, sender: 'admin', text: 'hi', readAt: null },
      { id: 2, sender: 'admin', text: 'there', readAt: null }
    ]);
    await loadSupportMessages();
    expect(state.unread[SUPPORT_KEY]).toBe(2);
  });

  it('does not mark unread when all admin messages are already read', async () => {
    api.get.mockResolvedValue([{ id: 1, sender: 'admin', text: 'hi', readAt: '2026-01-01T10:00:00Z' }]);
    await loadSupportMessages();
    expect(state.unread[SUPPORT_KEY]).toBeUndefined();
  });
});
