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

const { state, setState, postState, editListing } = await import('./store');

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
      f: ['furn'],
      desc: '',
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
  setState({ post: null, myRemote: [], remoteListings: [], remoteFavorites: [] });
});

describe('postState defaults', () => {
  it('starts with no repair condition pre-selected, forcing an explicit choice', () => {
    expect(postState().repair).toBe('');
  });
});

describe('editListing restores the current repair condition', () => {
  it('preselects the listing repair condition when it is a valid enum value', () => {
    setState('myRemote', [remoteItem('E1', 'cosmetic')]);
    editListing('E1');
    expect(postState().repair).toBe('cosmetic');
    expect(postState().editId).toBe('E1');
  });

  it('leaves the field unselected for a legacy listing with the unspecified sentinel', () => {
    setState('myRemote', [remoteItem('E2', 'unspecified')]);
    editListing('E2');
    expect(postState().repair).toBe('');
  });

  it('leaves the field unselected when the server value is unknown', () => {
    setState('myRemote', [remoteItem('E3', 'luxury')]);
    editListing('E3');
    expect(postState().repair).toBe('');
  });
});
