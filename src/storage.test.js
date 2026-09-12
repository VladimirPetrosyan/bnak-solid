import { describe, it, expect } from 'vitest';
import { safeGet, safeSet, safeRemove, readMigrated } from './storage';

function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
    _data: data
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
    removeItem: () => {
      throw new Error('blocked');
    }
  };
}

describe('safeGet/safeSet/safeRemove', () => {
  it('reads and writes normally', () => {
    const storage = makeStorage();
    safeSet(storage, 'k', 'v');
    expect(safeGet(storage, 'k')).toBe('v');
    safeRemove(storage, 'k');
    expect(safeGet(storage, 'k')).toBe(null);
  });

  it('swallows exceptions from a blocked storage', () => {
    const storage = throwingStorage();
    expect(() => safeSet(storage, 'k', 'v')).not.toThrow();
    expect(safeGet(storage, 'k')).toBe(null);
    expect(() => safeRemove(storage, 'k')).not.toThrow();
  });
});

describe('readMigrated', () => {
  it('prefers the new key when both are present', () => {
    const storage = makeStorage({ new: 'a', old: 'b' });
    expect(readMigrated(storage, 'new', 'old')).toBe('a');
  });

  it('falls back to the legacy key when the new key is missing', () => {
    const storage = makeStorage({ old: 'b' });
    expect(readMigrated(storage, 'new', 'old')).toBe('b');
  });

  it('returns null when neither key is present', () => {
    const storage = makeStorage();
    expect(readMigrated(storage, 'new', 'old')).toBe(null);
  });

  it('returns null when storage throws', () => {
    const storage = throwingStorage();
    expect(readMigrated(storage, 'new', 'old')).toBe(null);
  });
});
