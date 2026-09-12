import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';

class FakeScript {
  constructor(id) {
    this.id = id;
    this.listeners = {};
    this.parentNode = null;
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type, fn) {
    this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn);
  }
  dispatch(type) {
    (this.listeners[type] || []).slice().forEach((fn) => fn());
  }
}

function makeDocument() {
  let current = null;
  const head = {
    appendChild(el) {
      current = el;
      el.parentNode = head;
    },
    removeChild(el) {
      if (current === el) current = null;
      el.parentNode = null;
    }
  };
  return {
    head,
    createElement: () => new FakeScript(),
    getElementById: (id) => (current && current.id === id ? current : null),
    current: () => current
  };
}

let fakeDocument;
let fakeWindow;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  fakeDocument = makeDocument();
  fakeWindow = {};
  vi.stubGlobal('document', fakeDocument);
  vi.stubGlobal('window', fakeWindow);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

async function importLoader() {
  return await import('./yandexMapsLoader');
}

describe('loadYandexMaps', () => {
  it('rejects immediately when the key or locale is missing', async () => {
    const { loadYandexMaps } = await importLoader();
    await expect(loadYandexMaps('', 'ru_RU')).rejects.toEqual({ code: 'no-key' });
    await expect(loadYandexMaps('key', null)).rejects.toEqual({ code: 'no-key' });
  });

  it('resolves with window.ymaps3 once the script loads and ymaps3.ready settles', async () => {
    const { loadYandexMaps } = await importLoader();
    const promise = loadYandexMaps('key', 'ru_RU');
    const script = fakeDocument.current();
    expect(script.id).toBe('hayhome-yandex-maps-script');

    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    script.dispatch('load');
    await expect(promise).resolves.toBe(fakeWindow.ymaps3);
  });

  it('dedupes concurrent calls for the same locale into one script and one promise', async () => {
    const { loadYandexMaps } = await importLoader();
    const p1 = loadYandexMaps('key', 'ru_RU');
    const p2 = loadYandexMaps('key', 'ru_RU');
    expect(p1).toBe(p2);

    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    fakeDocument.current().dispatch('load');
    await expect(p1).resolves.toBe(fakeWindow.ymaps3);
  });

  it('rejects with timeout and removes the script if load never fires', async () => {
    const { loadYandexMaps } = await importLoader();
    const promise = loadYandexMaps('key', 'ru_RU', 1000);
    const rejection = expect(promise).rejects.toEqual({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(1000);
    await rejection;
    expect(fakeDocument.current()).toBeNull();
  });

  it('rejects with script-error on a script load failure', async () => {
    const { loadYandexMaps } = await importLoader();
    const promise = loadYandexMaps('key', 'ru_RU');
    fakeDocument.current().dispatch('error');
    await expect(promise).rejects.toEqual({ code: 'script-error' });
    expect(fakeDocument.current()).toBeNull();
  });

  it('rejects with script-error if ymaps3.ready itself rejects', async () => {
    const { loadYandexMaps } = await importLoader();
    const promise = loadYandexMaps('key', 'ru_RU');
    fakeWindow.ymaps3 = { ready: Promise.reject(new Error('boom')) };
    fakeDocument.current().dispatch('load');
    await expect(promise).rejects.toEqual({ code: 'script-error' });
  });

  it('switching locale before ready supersedes the stale load and leaves a single global', async () => {
    const { loadYandexMaps } = await importLoader();
    const ruPromise = loadYandexMaps('key', 'ru_RU');
    const ruScript = fakeDocument.current();

    const enPromise = loadYandexMaps('key', 'en_US');
    expect(fakeDocument.current()).not.toBe(ruScript);

    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    ruScript.dispatch('load');
    await expect(ruPromise).rejects.toEqual({ code: 'superseded' });

    const enYmaps3 = { ready: Promise.resolve() };
    fakeWindow.ymaps3 = enYmaps3;
    fakeDocument.current().dispatch('load');
    await expect(enPromise).resolves.toBe(enYmaps3);
  });

  it('keeps a single script and one clean global across rapid RU -> EN -> HY -> RU switching, since all resolve to the same locale', async () => {
    const { loadYandexMaps } = await importLoader();
    const ruPromise = loadYandexMaps('key', 'ru_RU');
    const script = fakeDocument.current();

    const enPromise = loadYandexMaps('key', 'ru_RU');
    const hyPromise = loadYandexMaps('key', 'ru_RU');
    expect(enPromise).toBe(ruPromise);
    expect(hyPromise).toBe(ruPromise);
    expect(fakeDocument.current()).toBe(script);

    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    script.dispatch('load');
    await expect(ruPromise).resolves.toBe(fakeWindow.ymaps3);

    const finalRuPromise = loadYandexMaps('key', 'ru_RU');
    await expect(finalRuPromise).resolves.toBe(fakeWindow.ymaps3);
    expect(fakeDocument.current()).toBe(script);
  });

  it('retries with a fresh script after a script-error, without leaking the failed one', async () => {
    const { loadYandexMaps } = await importLoader();
    const first = loadYandexMaps('key', 'ru_RU');
    const failedScript = fakeDocument.current();
    failedScript.dispatch('error');
    await expect(first).rejects.toEqual({ code: 'script-error' });
    expect(fakeDocument.current()).toBeNull();

    const retried = loadYandexMaps('key', 'ru_RU');
    const newScript = fakeDocument.current();
    expect(newScript).not.toBeNull();
    expect(newScript).not.toBe(failedScript);

    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    newScript.dispatch('load');
    await expect(retried).resolves.toBe(fakeWindow.ymaps3);
  });

  it('collapses rapid retry clicks into the single in-flight attempt instead of spawning new scripts', async () => {
    const { loadYandexMaps } = await importLoader();
    const first = loadYandexMaps('key', 'ru_RU');
    const script = fakeDocument.current();

    const retry1 = loadYandexMaps('key', 'ru_RU');
    const retry2 = loadYandexMaps('key', 'ru_RU');
    expect(retry1).toBe(first);
    expect(retry2).toBe(first);
    expect(fakeDocument.current()).toBe(script);

    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    script.dispatch('load');
    await expect(first).resolves.toBe(fakeWindow.ymaps3);
  });

  it('reuses the cached global for a repeat call with the same already-loaded locale', async () => {
    const { loadYandexMaps } = await importLoader();
    const first = loadYandexMaps('key', 'ru_RU');
    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    fakeDocument.current().dispatch('load');
    await first;

    const second = loadYandexMaps('key', 'ru_RU');
    await expect(second).resolves.toBe(fakeWindow.ymaps3);
  });
});

describe('unloadYandexMaps', () => {
  it('clears the global and removes the script', async () => {
    const { loadYandexMaps, unloadYandexMaps } = await importLoader();
    const promise = loadYandexMaps('key', 'ru_RU');
    fakeWindow.ymaps3 = { ready: Promise.resolve() };
    fakeDocument.current().dispatch('load');
    await promise;

    unloadYandexMaps();
    expect(fakeWindow.ymaps3).toBeUndefined();
    expect(fakeDocument.current()).toBeNull();
  });
});
