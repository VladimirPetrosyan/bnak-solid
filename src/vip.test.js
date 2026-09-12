import { describe, it, expect } from 'vitest';
import { promotedOf, edgeState } from './vip';

describe('promotedOf', () => {
  it('keeps only promoted listings', () => {
    const list = [{ id: 'a', promoted: true }, { id: 'b' }, { id: 'c', promoted: true }];
    expect(promotedOf(list)).toEqual([
      { id: 'a', promoted: true },
      { id: 'c', promoted: true }
    ]);
  });

  it('works on an already filtered list', () => {
    const filtered = [
      { id: 'a', promoted: true, city: 'yerevan' },
      { id: 'b', promoted: false, city: 'yerevan' }
    ];
    expect(promotedOf(filtered)).toEqual([{ id: 'a', promoted: true, city: 'yerevan' }]);
  });

  it('handles an empty list', () => {
    expect(promotedOf([])).toEqual([]);
  });

  it('handles a single promoted item', () => {
    const list = [{ id: 'a', promoted: true }];
    expect(promotedOf(list)).toEqual(list);
  });

  it('does not mutate the input array', () => {
    const list = [{ id: 'a', promoted: true }, { id: 'b' }];
    const copy = [...list];
    promotedOf(list);
    expect(list).toEqual(copy);
  });
});

describe('edgeState', () => {
  it('treats empty/zero metrics as both edges', () => {
    expect(edgeState({ scrollLeft: 0, clientWidth: 0, scrollWidth: 0 })).toEqual({ atStart: true, atEnd: true });
  });

  it('treats content that does not overflow as both edges', () => {
    expect(edgeState({ scrollLeft: 0, clientWidth: 400, scrollWidth: 300 })).toEqual({ atStart: true, atEnd: true });
  });

  it('detects the start', () => {
    expect(edgeState({ scrollLeft: 0, clientWidth: 300, scrollWidth: 900 })).toEqual({ atStart: true, atEnd: false });
  });

  it('detects the middle', () => {
    expect(edgeState({ scrollLeft: 300, clientWidth: 300, scrollWidth: 900 })).toEqual({ atStart: false, atEnd: false });
  });

  it('detects the end', () => {
    expect(edgeState({ scrollLeft: 600, clientWidth: 300, scrollWidth: 900 })).toEqual({ atStart: false, atEnd: true });
  });

  it('tolerates a 2px rounding error at both edges', () => {
    expect(edgeState({ scrollLeft: 1.5, clientWidth: 300, scrollWidth: 900 })).toEqual({ atStart: true, atEnd: false });
    expect(edgeState({ scrollLeft: 598.5, clientWidth: 300, scrollWidth: 900 })).toEqual({ atStart: false, atEnd: true });
  });
});
