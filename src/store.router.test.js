import { describe, it, expect, vi } from 'vitest';

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

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {}, location: { pathname: '/' } };
if (!globalThis.window.location) globalThis.window.location = { pathname: '/' };
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

const { parseRoute, pathFor } = await import('./store');

describe('parseRoute', () => {
  it('resolves known routes', () => {
    expect(parseRoute('/')).toEqual({ screen: 'search' });
    expect(parseRoute('/map')).toEqual({ screen: 'map' });
    expect(parseRoute('/favorites')).toEqual({ screen: 'fav' });
    expect(parseRoute('/listing/abc-123')).toEqual({ screen: 'listing', active: 'abc-123' });
  });

  it('falls back to a 404 screen for unknown routes, keeping the original path', () => {
    expect(parseRoute('/qa-nonexistent-page')).toEqual({ screen: 'notFound', notFoundPath: '/qa-nonexistent-page' });
  });

  it('does not mask a deep unknown path behind the homepage', () => {
    const route = parseRoute('/some/deep/unknown/path');
    expect(route.screen).toBe('notFound');
    expect(route.notFoundPath).toBe('/some/deep/unknown/path');
  });
});

describe('pathFor', () => {
  it('reproduces the original unknown path for the 404 screen', () => {
    expect(pathFor({ screen: 'notFound', notFoundPath: '/qa-nonexistent-page' })).toBe('/qa-nonexistent-page');
  });

  it('builds known screen paths', () => {
    expect(pathFor({ screen: 'map' })).toBe('/map');
    expect(pathFor({ screen: 'listing', active: 'abc-123' })).toBe('/listing/abc-123');
  });
});
