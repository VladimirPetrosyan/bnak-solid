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
    ApiError,
    API_BASE: 'http://localhost:8080'
  };
});

vi.mock('./realtime', () => ({
  connectRealtime: vi.fn(),
  disconnectRealtime: vi.fn()
}));

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {} };
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
  setState({
    user: { id: 'me', role: 'tenant' },
    token: 'tok',
    threads: {},
    unread: {},
    thread: null,
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

  it('opening it fetches /api/support/messages and marks it read, not /api/threads', async () => {
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({ ok: true });
    openThread(SUPPORT_KEY);
    await Promise.resolve();
    await Promise.resolve();
    expect(api.get).toHaveBeenCalledWith('/api/support/messages');
    expect(api.get).not.toHaveBeenCalledWith(expect.stringContaining('/api/threads'));
    expect(api.post).toHaveBeenCalledWith('/api/support/read');
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
    expect(state.unread[SUPPORT_KEY]).toBe(true);
  });

  it('does not mark unread and marks read server-side when the support thread is open', async () => {
    setState('screen', 'chat');
    setState('thread', SUPPORT_KEY);
    api.post.mockResolvedValue({ ok: true });
    receiveSupportMessage({ message: { id: 1, sender: 'admin', text: 'hi', createdAt: '2026-01-01T10:00:00Z' } });
    expect(state.unread[SUPPORT_KEY]).toBeUndefined();
    await Promise.resolve();
    expect(api.post).toHaveBeenCalledWith('/api/support/read');
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
  it('marks support unread when fetched messages include an unread admin reply', async () => {
    api.get.mockResolvedValue([{ id: 1, sender: 'admin', text: 'hi', readAt: null }]);
    await loadSupportMessages();
    expect(state.unread[SUPPORT_KEY]).toBe(true);
  });

  it('does not mark unread when all admin messages are already read', async () => {
    api.get.mockResolvedValue([{ id: 1, sender: 'admin', text: 'hi', readAt: '2026-01-01T10:00:00Z' }]);
    await loadSupportMessages();
    expect(state.unread[SUPPORT_KEY]).toBeUndefined();
  });
});
