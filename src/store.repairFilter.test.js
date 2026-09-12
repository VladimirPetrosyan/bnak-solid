import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./data', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, LIST: [] };
});

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
const { state, setState, visible, resetFilters, activeFilterCount } = await import('./store');

function remoteItem(id, repairCondition) {
  return {
    listing: {
      id,
      deal: 'rent',
      city: 'yerevan',
      d: 'kentron',
      street: 'Test str',
      price: 100000,
      rooms: 2,
      area: 50,
      fl: 2,
      fls: 5,
      status: 'active',
      ownerId: 'owner1',
      photos: [],
      repairCondition,
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    owner: { name: 'Owner' }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue([]);
  setState({
    deal: 'rent',
    city: 'yerevan',
    rooms: 'all',
    amen: {},
    repair: {},
    priceMin: '',
    priceMax: '',
    areaMin: '',
    areaMax: '',
    owners: true,
    agencies: true,
    fresh: 'f72',
    strict: true,
    query: '',
    bbox: null,
    remoteListings: [remoteItem('R1', 'none'), remoteItem('R2', 'good'), remoteItem('R3', 'designer')],
    myRemote: [],
    remoteFavorites: []
  });
});

describe('repair condition filter matching', () => {
  it('shows every listing when no repair condition is selected (any)', () => {
    const ids = visible().map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(['R1', 'R2', 'R3']));
  });

  it('narrows results down to the selected condition', () => {
    setState('repair', 'good', true);
    const ids = visible().map((l) => l.id);
    expect(ids).toEqual(['R2']);
  });

  it('matches any of several selected conditions', () => {
    setState('repair', { good: true, designer: true });
    const ids = visible()
      .map((l) => l.id)
      .sort();
    expect(ids).toEqual(['R2', 'R3']);
  });

  it('shows nothing when the selected condition matches no listing', () => {
    setState('repair', 'needs', true);
    expect(visible()).toEqual([]);
  });

  it('excludes a listing with an unrecognised server value once a filter is active', () => {
    setState('remoteListings', (list) => list.concat([remoteItem('R4', 'unspecified')]));
    setState('repair', 'good', true);
    const ids = visible().map((l) => l.id);
    expect(ids).toEqual(['R2']);
  });

  it('reactively changes the visible count as the selection changes', () => {
    expect(visible().length).toBe(3);
    setState('repair', 'good', true);
    expect(visible().length).toBe(1);
    setState('repair', 'good', false);
    expect(visible().length).toBe(3);
  });
});

describe('activeFilterCount', () => {
  it('does not count an empty repair selection', () => {
    expect(activeFilterCount()).toBe(0);
  });

  it('counts every selected repair condition', () => {
    setState('repair', { good: true, designer: true });
    expect(activeFilterCount()).toBe(2);
  });
});

describe('resetFilters', () => {
  it('clears the repair selection back to any', async () => {
    setState('repair', { good: true });
    resetFilters();
    expect(state.repair).toEqual({});
    expect(activeFilterCount()).toBe(0);
  });
});
