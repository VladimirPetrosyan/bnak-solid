import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

const post = vi.fn();
vi.mock('./api', () => ({
  api: { post: (...args) => post(...args) },
  API_BASE: 'http://localhost:8080'
}));

class FakeWebSocket {
  constructor(url) {
    if (FakeWebSocket.throwOnConstruct > 0) {
      FakeWebSocket.throwOnConstruct--;
      throw new Error('constructor failure');
    }
    this.url = url;
    this.closed = false;
    this.readyState = FakeWebSocket.OPEN;
    this.sent = [];
    this.throwOnSend = false;
    FakeWebSocket.instances.push(this);
  }
  send(data) {
    if (this.throwOnSend) throw new Error('send failure');
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('not open');
    this.sent.push(JSON.parse(data));
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose && this.onclose({});
  }
  emitMessage(data) {
    this.onmessage && this.onmessage({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }
}
FakeWebSocket.CONNECTING = 0;
FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSING = 2;
FakeWebSocket.CLOSED = 3;
FakeWebSocket.instances = [];
FakeWebSocket.throwOnConstruct = 0;

function makeWindow() {
  const listeners = {};
  return {
    addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
    emit: (type) => (listeners[type] || []).forEach((fn) => fn())
  };
}

const fakeWindow = makeWindow();
vi.stubGlobal('window', fakeWindow);
vi.stubGlobal('navigator', { onLine: true });
vi.stubGlobal('WebSocket', FakeWebSocket);

const { connectRealtime, disconnectRealtime, watchListing, clearListingWatch } = await import('./realtime');

beforeEach(() => {
  FakeWebSocket.instances = [];
  FakeWebSocket.throwOnConstruct = 0;
  post.mockReset();
  post.mockResolvedValue({ ticket: 't1' });
  globalThis.navigator.onLine = true;
  vi.useFakeTimers();
});

afterEach(() => {
  disconnectRealtime();
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('connectRealtime lifecycle', () => {
  it('fetches a ticket and opens a ws:// url built from API_BASE', async () => {
    const onStatus = vi.fn();
    connectRealtime({ onMessage: vi.fn(), onStatus });
    await vi.advanceTimersByTimeAsync(0);

    expect(post).toHaveBeenCalledWith('/api/realtime/ticket');
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe('ws://localhost:8080/api/realtime?ticket=t1');
    expect(onStatus).toHaveBeenCalledWith('connecting');
  });

  it('marks online on realtime.ready and dispatches typed events by type', async () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    connectRealtime({ onMessage, onStatus });
    await vi.advanceTimersByTimeAsync(0);
    const socket = FakeWebSocket.instances[0];

    socket.emitMessage({ type: 'realtime.ready', data: {} });
    expect(onStatus).toHaveBeenCalledWith('online');

    socket.emitMessage({ type: 'chat.message', data: { threadId: 'th1' } });
    expect(onMessage).toHaveBeenCalledWith('chat.message', { threadId: 'th1' });
  });

  it('ignores malformed events without throwing or dispatching', async () => {
    const onMessage = vi.fn();
    connectRealtime({ onMessage, onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    const socket = FakeWebSocket.instances[0];

    expect(() => socket.emitMessage('not json')).not.toThrow();
    expect(() => socket.emitMessage(JSON.stringify({ noType: true }))).not.toThrow();
    expect(() => socket.emitMessage(JSON.stringify(null))).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it('reconnects with growing capped backoff after an unexpected close, one timer at a time', async () => {
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    FakeWebSocket.instances[0].close();
    expect(FakeWebSocket.instances).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1300);
    expect(FakeWebSocket.instances).toHaveLength(2);

    FakeWebSocket.instances[1].close();
    await vi.advanceTimersByTimeAsync(1300);
    expect(FakeWebSocket.instances).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('does not retry while offline and reconnects immediately once online', async () => {
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    globalThis.navigator.onLine = false;
    FakeWebSocket.instances[0].close();
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);

    globalThis.navigator.onLine = true;
    fakeWindow.emit('online');
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('logout closes the socket and stops reconnect attempts', async () => {
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    const socket = FakeWebSocket.instances[0];

    disconnectRealtime();
    expect(socket.closed).toBe(true);
    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('ignores events from a socket superseded by reconnect or logout', async () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    connectRealtime({ onMessage, onStatus });
    await vi.advanceTimersByTimeAsync(0);
    const stale = FakeWebSocket.instances[0];

    disconnectRealtime();
    onStatus.mockClear();
    stale.emitMessage({ type: 'chat.message', data: {} });
    expect(onMessage).not.toHaveBeenCalled();
    expect(onStatus).not.toHaveBeenCalled();
  });

  it('a second connectRealtime call closes the previous socket instead of stacking connections', async () => {
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    const first = FakeWebSocket.instances[0];

    const onMessage = vi.fn();
    connectRealtime({ onMessage, onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);

    expect(first.closed).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(2);

    first.emitMessage({ type: 'chat.message', data: {} });
    expect(onMessage).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(60000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('does not throw when the WebSocket constructor fails synchronously, then reconnects once with backoff', async () => {
    const onStatus = vi.fn();
    FakeWebSocket.throwOnConstruct = 1;
    expect(() => connectRealtime({ onMessage: vi.fn(), onStatus })).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(onStatus).toHaveBeenCalledWith('offline');

    await vi.advanceTimersByTimeAsync(1300);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('recovers after several synchronous constructor failures with one reconnect timer at a time', async () => {
    FakeWebSocket.throwOnConstruct = 2;
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(FakeWebSocket.instances).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1300);
    expect(FakeWebSocket.instances).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(1300);
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe('watchListing / clearListingWatch', () => {
  async function connectAndReady() {
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    const socket = FakeWebSocket.instances[0];
    socket.emitMessage({ type: 'realtime.ready', data: {} });
    return socket;
  }

  it('does not send before realtime.ready', async () => {
    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    const socket = FakeWebSocket.instances[0];

    watchListing('L1');
    expect(socket.sent).toHaveLength(0);
  });

  it('sends listing.watch immediately once online', async () => {
    const socket = await connectAndReady();
    watchListing('L1');
    expect(socket.sent).toEqual([{ type: 'listing.watch', data: { listingId: 'L1' } }]);
  });

  it('re-sends the desired watch automatically after every ready, including reconnects', async () => {
    const socket = await connectAndReady();
    watchListing('L1');
    expect(socket.sent).toEqual([{ type: 'listing.watch', data: { listingId: 'L1' } }]);

    socket.close();
    await vi.advanceTimersByTimeAsync(1300);
    const socket2 = FakeWebSocket.instances[1];
    expect(socket2.sent).toHaveLength(0);
    socket2.emitMessage({ type: 'realtime.ready', data: {} });
    expect(socket2.sent).toEqual([{ type: 'listing.watch', data: { listingId: 'L1' } }]);
  });

  it('switching to a new listing sends the new id, replacing the old desired watch', async () => {
    const socket = await connectAndReady();
    watchListing('L1');
    watchListing('L2');
    expect(socket.sent.at(-1)).toEqual({ type: 'listing.watch', data: { listingId: 'L2' } });

    socket.close();
    await vi.advanceTimersByTimeAsync(1300);
    const socket2 = FakeWebSocket.instances[1];
    socket2.emitMessage({ type: 'realtime.ready', data: {} });
    expect(socket2.sent).toEqual([{ type: 'listing.watch', data: { listingId: 'L2' } }]);
  });

  it('clearListingWatch sends an empty listingId and stops restoring on reconnect', async () => {
    const socket = await connectAndReady();
    watchListing('L1');
    clearListingWatch();
    expect(socket.sent.at(-1)).toEqual({ type: 'listing.watch', data: { listingId: '' } });

    socket.close();
    await vi.advanceTimersByTimeAsync(1300);
    const socket2 = FakeWebSocket.instances[1];
    socket2.emitMessage({ type: 'realtime.ready', data: {} });
    expect(socket2.sent).toHaveLength(0);
  });

  it('logout clears the desired watch so a later login does not resend the old listing', async () => {
    const socket = await connectAndReady();
    watchListing('L1');
    disconnectRealtime();

    connectRealtime({ onMessage: vi.fn(), onStatus: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    const socket2 = FakeWebSocket.instances[1];
    socket2.emitMessage({ type: 'realtime.ready', data: {} });
    expect(socket2.sent).toHaveLength(0);
  });

  it('does nothing while disconnected or not yet open', () => {
    expect(() => watchListing('L1')).not.toThrow();
    expect(() => clearListingWatch()).not.toThrow();
  });

  it('swallows a synchronous throw from ws.send without breaking the connection', async () => {
    const socket = await connectAndReady();
    socket.throwOnSend = true;
    expect(() => watchListing('L1')).not.toThrow();

    socket.throwOnSend = false;
    expect(() => watchListing('L2')).not.toThrow();
    expect(socket.sent).toEqual([{ type: 'listing.watch', data: { listingId: 'L2' } }]);
  });

  it('does not send while the socket is closing or closed', async () => {
    const socket = await connectAndReady();
    socket.readyState = FakeWebSocket.CLOSING;
    watchListing('L1');
    expect(socket.sent).toHaveLength(0);
  });
});
