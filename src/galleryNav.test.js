import { describe, it, expect } from 'vitest';
import { photoCount, stepIndex, remainingPhotos, galleryIndex } from './galleryNav';

describe('photoCount', () => {
  it('uses the photos length when present', () => {
    expect(photoCount(['a', 'b', 'c'], 5)).toBe(3);
  });

  it('falls back when photos is missing or empty', () => {
    expect(photoCount(undefined, 5)).toBe(5);
    expect(photoCount(null, 5)).toBe(5);
    expect(photoCount([], 5)).toBe(5);
  });
});

describe('stepIndex', () => {
  it('wraps forward and backward within the photo count', () => {
    expect(stepIndex(0, 1, 3)).toBe(1);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, -1, 3)).toBe(2);
  });

  it('stays at 0 for a single photo', () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
  });

  it('is safe for a zero or missing count', () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
    expect(stepIndex(3, 1, undefined)).toBe(0);
  });

  it('is always a finite integer for NaN/Infinity/string/fractional inputs', () => {
    expect(stepIndex(NaN, 1, 3)).toBe(1);
    expect(stepIndex(0, Infinity, 3)).toBe(0);
    expect(stepIndex('2', 1, 3)).toBe(0);
    expect(stepIndex(1.7, 1, 3)).toBe(2);
    expect(stepIndex(-5, 0, 3)).toBe(1);
    expect(stepIndex(1e21, 0, 3)).toBe(1);
    expect(stepIndex(0, 1, NaN)).toBe(0);
    expect(stepIndex(0, 1, Infinity)).toBe(0);
    expect(stepIndex(0, 1, '3')).toBe(1);
  });
});

describe('remainingPhotos', () => {
  it('subtracts the shown tiles from the total', () => {
    expect(remainingPhotos(10)).toBe(7);
  });

  it('never goes negative when ph is at or below the shown count', () => {
    expect(remainingPhotos(2)).toBe(0);
    expect(remainingPhotos(0)).toBe(0);
    expect(remainingPhotos(3)).toBe(0);
  });

  it('is safe for missing or invalid ph', () => {
    expect(remainingPhotos(undefined)).toBe(0);
    expect(remainingPhotos(NaN)).toBe(0);
  });
});

describe('galleryIndex', () => {
  it('folds a requested index back into range for one real photo', () => {
    expect(galleryIndex(2, ['a'])).toBe(0);
  });

  it('never opens index 2 for two real photos', () => {
    expect(galleryIndex(2, ['a', 'b'])).not.toBe(2);
    expect(galleryIndex(2, ['a', 'b'])).toBe(0);
  });

  it('opens 0/1/2 for three real photos', () => {
    expect(galleryIndex(0, ['a', 'b', 'c'])).toBe(0);
    expect(galleryIndex(1, ['a', 'b', 'c'])).toBe(1);
    expect(galleryIndex(2, ['a', 'b', 'c'])).toBe(2);
  });

  it('keeps a consistent placeholder fallback for undefined or empty photos', () => {
    expect(galleryIndex(2, undefined, 5)).toBe(2);
    expect(galleryIndex(2, [], 5)).toBe(2);
  });

  it('is always a finite integer for NaN/Infinity/string/fractional inputs', () => {
    expect(galleryIndex(NaN, ['a', 'b', 'c'])).toBe(0);
    expect(galleryIndex(Infinity, ['a', 'b', 'c'])).toBe(0);
    expect(galleryIndex('1', ['a', 'b', 'c'])).toBe(1);
    expect(galleryIndex(1.7, ['a', 'b', 'c'])).toBe(1);
    expect(galleryIndex(-1, ['a', 'b', 'c'])).toBe(2);
    expect(galleryIndex(1e21, ['a', 'b', 'c'])).toBe(1);
  });

  it('handles 0/1/2/3 photos with a fallback of 0', () => {
    expect(galleryIndex(0, undefined, 0)).toBe(0);
    expect(galleryIndex(0, ['a'], 0)).toBe(0);
    expect(galleryIndex(1, ['a', 'b'], 0)).toBe(1);
    expect(galleryIndex(3, ['a', 'b', 'c'], 0)).toBe(0);
  });

  it('handles 0/1/2/3 photos with a fallback of 5', () => {
    expect(galleryIndex(0, undefined, 5)).toBe(0);
    expect(galleryIndex(0, ['a'], 5)).toBe(0);
    expect(galleryIndex(1, ['a', 'b'], 5)).toBe(1);
    expect(galleryIndex(3, ['a', 'b', 'c'], 5)).toBe(0);
  });
});
