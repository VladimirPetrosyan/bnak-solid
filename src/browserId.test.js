import { describe, it, expect } from 'vitest';
import { genBrowserId, getBrowserId } from './browserId';

describe('genBrowserId', () => {
  it('generates a 32-char lowercase hex id', () => {
    expect(genBrowserId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates a different id on each call', () => {
    expect(genBrowserId()).not.toBe(genBrowserId());
  });
});

function makeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    }
  };
}

describe('getBrowserId', () => {
  it('generates and persists a new id under the new key when storage is empty', () => {
    const storage = makeStorage();
    const id = getBrowserId(storage);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(storage.getItem('hayhome.browserId')).toBe(id);
  });

  it('reuses the stored id on subsequent calls', () => {
    const storage = makeStorage({ 'hayhome.browserId': 'deadbeefdeadbeefdeadbeefdeadbeef' });
    expect(getBrowserId(storage)).toBe('deadbeefdeadbeefdeadbeefdeadbeef');
  });

  it('migrates a valid legacy id to the new key', () => {
    const storage = makeStorage({ 'bnak.browserId': 'deadbeefdeadbeefdeadbeefdeadbeef' });
    const id = getBrowserId(storage);
    expect(id).toBe('deadbeefdeadbeefdeadbeefdeadbeef');
    expect(storage.getItem('hayhome.browserId')).toBe('deadbeefdeadbeefdeadbeefdeadbeef');
  });

  it('prefers the new key when both new and legacy ids are present', () => {
    const storage = makeStorage({
      'hayhome.browserId': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      'bnak.browserId': 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    });
    expect(getBrowserId(storage)).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('falls back to a fresh id when no storage is available', () => {
    expect(getBrowserId(null)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('falls back to a fresh id when storage throws', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    };
    expect(getBrowserId(storage)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('replaces and persists a corrupted (non-hex) stored id', () => {
    const storage = makeStorage({ 'hayhome.browserId': 'not-a-valid-id!!' });
    const id = getBrowserId(storage);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toBe('not-a-valid-id!!');
    expect(storage.getItem('hayhome.browserId')).toBe(id);
  });

  it('replaces a stored id that is too long', () => {
    const storage = makeStorage({ 'hayhome.browserId': 'a'.repeat(64) });
    const id = getBrowserId(storage);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('replaces a stored id containing whitespace', () => {
    const storage = makeStorage({ 'hayhome.browserId': 'aaaaaaaaaaaaaaaa aaaaaaaaaaaaaa' });
    const id = getBrowserId(storage);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });
});
