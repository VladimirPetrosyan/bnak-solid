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
    setApiLang: vi.fn(),
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

globalThis.window = globalThis.window || { innerWidth: 1024, scrollTo: () => {}, location: { pathname: '/' } };
globalThis.localStorage = globalThis.localStorage || new MemoryStorage();

const { state, setState, openLegal, legalBack } = await import('./store');

beforeEach(() => {
  setState({ screen: 'search', legalId: null, legalFrom: 'search' });
});

describe('openLegal', () => {
  it('opens a known document from the footer and remembers where the user came from', () => {
    setState('screen', 'fav');
    openLegal('privacy');
    expect(state.screen).toBe('legal');
    expect(state.legalId).toBe('privacy');
    expect(state.legalFrom).toBe('fav');
  });

  it('falls back to the document list for an unknown id, without breaking navigation', () => {
    openLegal('does-not-exist');
    expect(state.screen).toBe('legal');
    expect(state.legalId).toBeNull();
  });

  it('opens the list directly when called without an id', () => {
    openLegal(null);
    expect(state.screen).toBe('legal');
    expect(state.legalId).toBeNull();
  });

  it('keeps the original origin screen when switching between documents inside legal', () => {
    setState('screen', 'cabinet');
    openLegal('terms');
    openLegal('cookies');
    expect(state.legalFrom).toBe('cabinet');
  });
});

describe('legalBack', () => {
  it('pops from a document to the list before leaving the legal screen', () => {
    setState('screen', 'search');
    openLegal('contacts');
    legalBack();
    expect(state.screen).toBe('legal');
    expect(state.legalId).toBeNull();
    legalBack();
    expect(state.screen).toBe('search');
  });

  it('falls back to search when there is no recorded origin screen', () => {
    setState({ screen: 'legal', legalId: null, legalFrom: null });
    legalBack();
    expect(state.screen).toBe('search');
  });
});
