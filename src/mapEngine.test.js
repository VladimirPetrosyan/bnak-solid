import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('document', { createElement: () => ({}) });

import { markerStyle, createYandexPointMap, createYandexEngine, isValidBounds, filterListingsByBounds } from './mapEngine';

const INK = '#1c1b19';
const TEAL = '#0e7c73';

describe('markerStyle', () => {
  it('paints the selected listing ink regardless of freshness', () => {
    expect(markerStyle({ selected: true, fresh: true, vip: false }, INK, TEAL)).toEqual({
      bg: INK,
      fg: '#fff',
      border: '1px solid rgba(28,27,25,.08)'
    });
  });

  it('paints a fresh, non-selected listing teal', () => {
    expect(markerStyle({ selected: false, fresh: true, vip: false }, INK, TEAL)).toEqual({
      bg: TEAL,
      fg: '#fff',
      border: '1px solid rgba(28,27,25,.08)'
    });
  });

  it('paints an aging, non-selected listing light with a plain border', () => {
    expect(markerStyle({ selected: false, fresh: false, vip: false }, INK, TEAL)).toEqual({
      bg: '#fff',
      fg: INK,
      border: '1px solid rgba(28,27,25,.08)'
    });
  });

  it('gives vip listings a thicker ink border as an accent, independent of color', () => {
    expect(markerStyle({ selected: false, fresh: true, vip: true }, INK, TEAL).border).toBe(`1.5px solid ${INK}`);
    expect(markerStyle({ selected: false, fresh: false, vip: true }, INK, TEAL).border).toBe(`1.5px solid ${INK}`);
  });
});

function mockYmaps3(destroy) {
  class YMap {
    constructor() {
      this.destroy = destroy;
    }
    addChild() {
      throw new Error('layer failed');
    }
  }
  class YMapDefaultSchemeLayer {}
  class YMapDefaultFeaturesLayer {}
  class YMapMarker {}
  return { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker };
}

describe('createYandexPointMap', () => {
  it('destroys the partially created map before the error escapes', () => {
    const destroy = vi.fn();
    const ymaps3 = mockYmaps3(destroy);
    const host = document.createElement('div');
    expect(() => createYandexPointMap(ymaps3, host, { lat: 40.1965, lng: 44.4615 })).toThrow('layer failed');
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

describe('createYandexEngine', () => {
  it('destroys the partially created map before the error escapes', () => {
    const destroy = vi.fn();
    const ymaps3 = mockYmaps3(destroy);
    const host = document.createElement('div');
    expect(() => createYandexEngine(ymaps3, host, { center: [40.1965, 44.4615], zoom: 12 })).toThrow('layer failed');
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});

describe('isValidBounds', () => {
  it('accepts a well-formed [swLat, swLng, neLat, neLng] box', () => {
    expect(isValidBounds([40.1, 44.4, 40.3, 44.6])).toBe(true);
  });

  it('rejects null, malformed, and inverted boxes', () => {
    expect(isValidBounds(null)).toBe(false);
    expect(isValidBounds(undefined)).toBe(false);
    expect(isValidBounds([40.1, 44.4, 40.3])).toBe(false);
    expect(isValidBounds([40.1, 44.4, NaN, 44.6])).toBe(false);
    expect(isValidBounds([40.3, 44.4, 40.1, 44.6])).toBe(false);
    expect(isValidBounds([40.1, 44.6, 40.3, 44.4])).toBe(false);
  });
});

describe('filterListingsByBounds', () => {
  const bounds = [40.1, 44.4, 40.3, 44.6];
  const inside = { id: 'in', ll: [40.2, 44.5] };
  const onEdge = { id: 'edge', ll: [40.1, 44.6] };
  const outside = { id: 'out', ll: [40.9, 44.9] };
  const noCoords = { id: 'nocoords', ll: null };

  it('returns the original list unchanged when bounds are invalid or missing', () => {
    const list = [inside, outside, noCoords];
    expect(filterListingsByBounds(list, null)).toBe(list);
    expect(filterListingsByBounds(list, [1, 2, 3])).toBe(list);
  });

  it('keeps listings inside the box and on its edge, drops listings outside it', () => {
    expect(filterListingsByBounds([inside, onEdge, outside], bounds)).toEqual([inside, onEdge]);
  });

  it('excludes listings with missing or invalid coordinates only once bounds are valid', () => {
    expect(filterListingsByBounds([inside, noCoords], bounds)).toEqual([inside]);
  });

  it('returns an empty array when nothing falls inside the box', () => {
    expect(filterListingsByBounds([outside], bounds)).toEqual([]);
  });
});
