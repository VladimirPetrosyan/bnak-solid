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
const { disconnectRealtime } = await import('./realtime');
const { state, setState, receiveRealtimeMessage, loadThreadMessages, signOut } = await import('./store');

function remoteThread(overrides) {
  return { remote: true, listing: 'L1', other: { id: 'owner1', name: 'Owner' }, msgs: [], ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.post.mockResolvedValue(undefined);
  setState({ user: { id: 'me', role: 'tenant' }, token: 'tok', threads: {}, unread: {}, thread: null });
});

describe('receiveRealtimeMessage', () => {
  it('appends a message from another user to an already-loaded thread', () => {
    setState('threads', { th1: remoteThread() });
    receiveRealtimeMessage({ message: { id: 5, senderId: 'owner1', kind: 'text', text: 'hi' }, threadId: 'th1' });
    expect(state.threads.th1.msgs).toHaveLength(1);
    expect(state.threads.th1.msgs[0].text).toBe('hi');
  });

  it('dedupes by message id when the same message arrives twice (WS + REST race)', () => {
    setState('threads', { th1: remoteThread({ msgs: [{ id: 5, text: 'hi', me: false }] }) });
    receiveRealtimeMessage({ message: { id: 5, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(state.threads.th1.msgs).toHaveLength(1);
  });

  it('preserves arrival order, appending after existing messages', () => {
    setState('threads', { th1: remoteThread({ msgs: [{ id: 1, text: 'first' }] }) });
    receiveRealtimeMessage({ message: { id: 2, senderId: 'owner1', text: 'second' }, threadId: 'th1' });
    receiveRealtimeMessage({ message: { id: 3, senderId: 'owner1', text: 'third' }, threadId: 'th1' });
    expect(state.threads.th1.msgs.map((m) => m.text)).toEqual(['first', 'second', 'third']);
  });

  it('marks unread for a message from someone else in a thread that is not open', () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'other-thread');
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(state.unread.th1).toBe(true);
  });

  it('does not mark unread when the thread is currently open', () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'th1');
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(state.unread.th1).toBeUndefined();
  });

  it('does not mark unread for its own message arriving from another tab', () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'other-thread');
    receiveRealtimeMessage({ message: { id: 1, senderId: 'me', text: 'hi' }, threadId: 'th1' });
    expect(state.unread.th1).toBeUndefined();
    expect(state.threads.th1.msgs[0].me).toBe(true);
  });

  it('does not touch unread for a duplicate delivery', () => {
    setState('threads', { th1: remoteThread({ msgs: [{ id: 1, text: 'hi', me: false }] }) });
    setState('thread', 'other-thread');
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(state.unread.th1).toBeUndefined();
  });

  it('refreshes the thread list for a thread it does not know about yet (new thread)', () => {
    api.get.mockResolvedValue([]);
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'unknown-thread' });
    expect(api.get).toHaveBeenCalledWith('/api/threads');
    expect(state.threads['unknown-thread']).toBeUndefined();
  });

  it('ignores malformed payloads without throwing', () => {
    expect(() => receiveRealtimeMessage(null)).not.toThrow();
    expect(() => receiveRealtimeMessage({})).not.toThrow();
    expect(() => receiveRealtimeMessage({ message: {} })).not.toThrow();
  });

  it('sorts messages by numeric id even when WS delivers them out of order', () => {
    setState('threads', { th1: remoteThread() });
    receiveRealtimeMessage({ message: { id: 9, senderId: 'owner1', text: 'later' }, threadId: 'th1' });
    receiveRealtimeMessage({ message: { id: 4, senderId: 'owner1', text: 'earlier' }, threadId: 'th1' });
    expect(state.threads.th1.msgs.map((m) => m.text)).toEqual(['earlier', 'later']);
  });

  it('ignores a message without a positive numeric server id as malformed', () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'other-thread');
    receiveRealtimeMessage({ message: { senderId: 'owner1', text: 'no-id-1' }, threadId: 'th1' });
    receiveRealtimeMessage({ message: { id: 0, senderId: 'owner1', text: 'zero-id' }, threadId: 'th1' });
    receiveRealtimeMessage({ message: { id: -1, senderId: 'owner1', text: 'neg-id' }, threadId: 'th1' });
    expect(state.threads.th1.msgs).toHaveLength(0);
    expect(state.unread.th1).toBeUndefined();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not lose a WS message that arrives while GET history is in flight', async () => {
    setState('threads', { th1: remoteThread() });
    let resolveGet;
    api.get.mockReturnValue(
      new Promise((res) => {
        resolveGet = res;
      })
    );
    const pending = loadThreadMessages('th1', 'L1', { id: 'owner1' });
    receiveRealtimeMessage({ message: { id: 7, senderId: 'owner1', text: 'ws-during-get' }, threadId: 'th1' });
    resolveGet([{ id: 5, senderId: 'owner1', text: 'history' }]);
    await pending;
    expect(state.threads.th1.msgs.map((m) => m.id)).toEqual([5, 7]);
  });

  it('calls the read endpoint and does not set unread for a message in the open thread', () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'th1');
    api.post.mockResolvedValue({ ok: true });
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(api.post).toHaveBeenCalledWith('/api/threads/th1/read');
    expect(state.unread.th1).toBeUndefined();
  });

  it('marks unread and does not call the read endpoint for a closed thread', () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'other-thread');
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(state.unread.th1).toBe(true);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('keeps the message even when the read endpoint call fails', async () => {
    setState('threads', { th1: remoteThread() });
    setState('thread', 'th1');
    api.post.mockRejectedValue(new Error('network'));
    receiveRealtimeMessage({ message: { id: 1, senderId: 'owner1', text: 'hi' }, threadId: 'th1' });
    expect(state.threads.th1.msgs[0].text).toBe('hi');
    await Promise.resolve();
    await Promise.resolve();
  });
});

describe('signOut', () => {
  it('sends the logout request before clearing the token, then disconnects and clears state without waiting for the response', async () => {
    const { setAuthToken } = await import('./api');
    setState({ user: { id: 'me' }, token: 'tok' });
    let resolveLogout;
    let resolved = false;
    api.post.mockReturnValue(
      new Promise((res) => {
        resolveLogout = res;
      }).then((v) => {
        resolved = true;
        return v;
      })
    );

    signOut();

    expect(api.post).toHaveBeenCalledWith('/api/auth/logout');
    expect(api.post.mock.invocationCallOrder[0]).toBeLessThan(setAuthToken.mock.invocationCallOrder[0]);
    expect(disconnectRealtime).toHaveBeenCalled();
    expect(setAuthToken).toHaveBeenCalledWith(null);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.realtimeStatus).toBe('offline');
    expect(resolved).toBe(false);

    resolveLogout({});
    await Promise.resolve();
    expect(resolved).toBe(true);
  });

  it('does not throw and leaves the rejection handled when the logout request rejects', async () => {
    setState({ user: { id: 'me' }, token: 'tok' });
    api.post.mockRejectedValue(new Error('network'));

    expect(() => signOut()).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});
