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

const { state, setState, myItems } = await import('./store');

function baseListing(overrides) {
  return {
    id: 'L1',
    deal: 'rent',
    city: 'yerevan',
    d: 'kentron',
    street: 'Full str',
    price: 100000,
    rooms: 2,
    area: 50,
    fl: 2,
    fls: 5,
    status: 'active',
    ownerId: 'owner1',
    photos: [],
    cadastreCode: '01-01-01-0001',
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setState({ user: { id: 'owner1', role: 'landlord' }, token: 'tok', remoteListings: [], myRemote: [], remoteFavorites: [] });
});

describe('mergeRemoteItem nested merge', () => {
  it('keeps detail owner/listing fields a short /mine response omits or nulls, applies fresh fields', () => {
    setState('remoteListings', [
      {
        listing: baseListing({}),
        owner: { name: 'Owner Name', phone: '+37499123456', role: 'owner' },
        views: 10,
        favorites: 3
      }
    ]);
    setState('myRemote', [
      {
        listing: baseListing({ cadastreCode: undefined, price: 120000 }),
        owner: { name: 'Owner Name', phone: null, role: 'owner' },
        favorites: 3
      }
    ]);

    const [item] = myItems();
    expect(item.ownerInfo.phone).toBe('+37499123456');
    expect(item.cadastreCode).toBe('01-01-01-0001');
    expect(item.price).toBe(120000);
  });

  it('applies falsy but defined incoming values instead of falling back to base', () => {
    setState('remoteListings', [
      {
        listing: baseListing({ price: 100000 }),
        owner: { name: 'Owner Name', phone: '+37499123456' },
        views: 10,
        favorites: 3
      }
    ]);
    setState('myRemote', [
      {
        listing: baseListing({ price: 0 }),
        owner: { name: 'Owner Name', phone: '' },
        favorites: 3
      }
    ]);

    const [item] = myItems();
    expect(item.price).toBe(0);
    expect(item.ownerInfo.phone).toBe('');
  });
});
