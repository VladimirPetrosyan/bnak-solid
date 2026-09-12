import { describe, it, expect } from 'vitest';
import { pickThreadKey } from './threadSelection';

describe('pickThreadKey', () => {
  it('returns the requested key when it exists', () => {
    expect(pickThreadKey({ a: {}, b: {} }, 'b')).toBe('b');
  });

  it('falls back to the first remaining key when the requested thread was deleted', () => {
    expect(pickThreadKey({ a: {}, b: {} }, 'deleted')).toBe('a');
  });

  it('returns null when there are no threads at all', () => {
    expect(pickThreadKey({}, 'anything')).toBeNull();
    expect(pickThreadKey({}, undefined)).toBeNull();
    expect(pickThreadKey({}, null)).toBeNull();
  });
});
