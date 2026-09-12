import { describe, it, expect } from 'vitest';
import { parseCoords, viewUrl, searchUrl } from './listingLocation';

describe('parseCoords', () => {
  it('parses a valid [lat,lng] pair', () => {
    expect(parseCoords([40.1965, 44.4615])).toEqual({ lat: 40.1965, lng: 44.4615 });
  });

  it('coerces numeric strings', () => {
    expect(parseCoords(['40.1965', '44.4615'])).toEqual({ lat: 40.1965, lng: 44.4615 });
  });

  it('rejects missing values', () => {
    expect(parseCoords(undefined)).toBeNull();
    expect(parseCoords(null)).toBeNull();
  });

  it('rejects a non-array or the wrong length', () => {
    expect(parseCoords('40,44')).toBeNull();
    expect(parseCoords([40.1965])).toBeNull();
    expect(parseCoords([40.1965, 44.4615, 10])).toBeNull();
  });

  it('rejects non-numeric components', () => {
    expect(parseCoords(['abc', 44.4615])).toBeNull();
    expect(parseCoords([NaN, 44.4615])).toBeNull();
  });

  it('rejects out-of-range coordinates', () => {
    expect(parseCoords([120, 44.4615])).toBeNull();
    expect(parseCoords([40.1965, 220])).toBeNull();
    expect(parseCoords([-91, 0.1])).toBeNull();
  });

  it('rejects null island [0,0]', () => {
    expect(parseCoords([0, 0])).toBeNull();
  });
});

describe('viewUrl', () => {
  it('links to the official Yandex map with the point in lng,lat order', () => {
    const url = viewUrl({ lat: 40.1965, lng: 44.4615 });
    expect(url.startsWith('https://yandex.com/maps/?')).toBe(true);
    const params = new URL(url).searchParams;
    expect(params.get('pt')).toBe('44.461500,40.196500');
    expect(params.get('z')).toBe('17');
    expect(params.get('l')).toBe('map');
  });

  it('accepts a custom zoom', () => {
    const url = viewUrl({ lat: 40.1965, lng: 44.4615 }, 14);
    expect(new URL(url).searchParams.get('z')).toBe('14');
  });

  it('returns null for invalid, undefined or out-of-range coords', () => {
    expect(viewUrl(undefined)).toBeNull();
    expect(viewUrl({ lat: 'x', lng: 44.4615 })).toBeNull();
    expect(viewUrl({ lat: 40.1965, lng: Infinity })).toBeNull();
    expect(viewUrl({ lat: -95, lng: 44.4615 })).toBeNull();
    expect(viewUrl({ lat: 0, lng: 0 })).toBeNull();
  });

  it('clamps an invalid or out-of-range zoom to a safe value', () => {
    const withNaN = viewUrl({ lat: 40.1965, lng: 44.4615 }, NaN);
    expect(new URL(withNaN).searchParams.get('z')).toBe('17');

    const tooHigh = viewUrl({ lat: 40.1965, lng: 44.4615 }, 999);
    expect(Number(new URL(tooHigh).searchParams.get('z'))).toBeLessThanOrEqual(21);

    const negative = viewUrl({ lat: 40.1965, lng: 44.4615 }, -5);
    expect(Number(new URL(negative).searchParams.get('z'))).toBeGreaterThanOrEqual(0);
  });
});

describe('searchUrl', () => {
  it('links to the official Yandex Maps search, encoding the address', () => {
    const url = searchUrl('Հալաբյան 24, Երևան');
    expect(url.startsWith('https://yandex.com/maps/?')).toBe(true);
    expect(new URL(url).searchParams.get('text')).toBe('Հալաբյան 24, Երևան');
  });

  it('returns a safe base link for an empty or missing address', () => {
    expect(searchUrl(undefined)).toBe('https://yandex.com/maps/');
    expect(searchUrl(null)).toBe('https://yandex.com/maps/');
    expect(searchUrl('   ')).toBe('https://yandex.com/maps/');
  });
});
