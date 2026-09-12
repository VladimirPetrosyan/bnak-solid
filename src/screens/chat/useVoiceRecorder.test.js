import { describe, it, expect, vi } from 'vitest';
import { useVoiceRecorder } from './useVoiceRecorder';

class FakeRecorder {
  constructor(stream, opts = {}) {
    this.stream = stream;
    this.state = 'inactive';
    this.mimeType = 'audio/webm';
    this.emitData = opts.emitData !== false;
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    if (this.emitData) this.ondataavailable({ data: { size: 10 } });
    this.onstop();
  }
}

function makeStream() {
  const stop = vi.fn();
  return { getTracks: () => [{ stop }], trackStop: stop };
}

function makeDeps(overrides = {}) {
  const stream = makeStream();
  return {
    getUserMedia: vi.fn(async () => stream),
    MediaRecorder: FakeRecorder,
    setInterval: vi.fn(() => 'timer-1'),
    clearInterval: vi.fn(),
    send: vi.fn(),
    onError: vi.fn(),
    stream,
    ...overrides
  };
}

describe('useVoiceRecorder', () => {
  it('start reports error when getUserMedia is unavailable', async () => {
    const deps = makeDeps({ getUserMedia: undefined });
    const rec = useVoiceRecorder(deps);
    await rec.start();
    expect(deps.onError).toHaveBeenCalledTimes(1);
    expect(rec.recording()).toBe(false);
  });

  it('start reports error when getUserMedia is denied', async () => {
    const deps = makeDeps({ getUserMedia: vi.fn(() => Promise.reject(new Error('denied'))) });
    const rec = useVoiceRecorder(deps);
    await rec.start();
    expect(deps.onError).toHaveBeenCalledTimes(1);
    expect(rec.recording()).toBe(false);
  });

  it('stop with send sends the recorded blob', async () => {
    const deps = makeDeps();
    const rec = useVoiceRecorder(deps);
    await rec.start();
    expect(rec.recording()).toBe(true);

    rec.stop(true);

    expect(deps.send).toHaveBeenCalledTimes(1);
    expect(deps.send.mock.calls[0][0]).toEqual(expect.any(String));
    expect(deps.send.mock.calls[0][1]).toBe(0);
    expect(rec.recording()).toBe(false);
    expect(deps.clearInterval).toHaveBeenCalledWith('timer-1');
    expect(deps.stream.trackStop).toHaveBeenCalledTimes(1);
  });

  it('cancel without send does not send', async () => {
    const deps = makeDeps();
    const rec = useVoiceRecorder(deps);
    await rec.start();

    rec.stop(false);

    expect(deps.send).not.toHaveBeenCalled();
    expect(rec.recording()).toBe(false);
  });

  it('stop before dataavailable does not send an empty blob', async () => {
    const deps = makeDeps({
      MediaRecorder: class extends FakeRecorder {
        constructor(stream) {
          super(stream, { emitData: false });
        }
      }
    });
    const rec = useVoiceRecorder(deps);
    await rec.start();

    rec.stop(true);

    expect(deps.send).not.toHaveBeenCalled();
  });

  it('cleanup stops recorder and clears the timer', async () => {
    const deps = makeDeps();
    const rec = useVoiceRecorder(deps);
    await rec.start();

    rec.cleanup();

    expect(deps.clearInterval).toHaveBeenCalledWith('timer-1');
    expect(deps.stream.trackStop).toHaveBeenCalledTimes(1);
  });

  it('double start/stop is safe', async () => {
    const deps = makeDeps();
    const rec = useVoiceRecorder(deps);
    await rec.start();
    rec.stop(true);
    expect(() => rec.stop(true)).not.toThrow();
    expect(() => rec.cleanup()).not.toThrow();
    expect(deps.send).toHaveBeenCalledTimes(1);
  });
});
