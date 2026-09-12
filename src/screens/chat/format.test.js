import { describe, it, expect } from 'vitest';
import { fmtSec, fmtSize } from './format';

describe('fmtSec', () => {
  it('formats seconds under a minute', () => {
    expect(fmtSec(0)).toBe('0:00');
    expect(fmtSec(9)).toBe('0:09');
  });

  it('formats minutes and seconds', () => {
    expect(fmtSec(65)).toBe('1:05');
    expect(fmtSec(600)).toBe('10:00');
  });
});

describe('fmtSize', () => {
  it('formats bytes', () => {
    expect(fmtSize(0)).toBe('0 B');
    expect(fmtSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(fmtSize(1024)).toBe('1 KB');
    expect(fmtSize(2048)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(fmtSize(1024 * 1024)).toBe('1.0 MB');
    expect(fmtSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});
