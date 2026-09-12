import { describe, it, expect } from 'vitest';
import { resolveApiBase } from './api';

describe('resolveApiBase', () => {
  it('uses VITE_API_URL when set, stripping trailing slashes', () => {
    expect(resolveApiBase({ VITE_API_URL: 'https://api.hayhome.am///', DEV: false })).toBe('https://api.hayhome.am');
  });

  it('trims whitespace around VITE_API_URL', () => {
    expect(resolveApiBase({ VITE_API_URL: '  https://api.hayhome.am  ', DEV: false })).toBe('https://api.hayhome.am');
  });

  it('accepts a relative VITE_API_URL like /api', () => {
    expect(resolveApiBase({ VITE_API_URL: '/api', DEV: false })).toBe('/api');
  });

  it('treats a whitespace-only VITE_API_URL as unset', () => {
    expect(resolveApiBase({ VITE_API_URL: '   ', DEV: false })).toBe('');
  });

  it('falls back to localhost in dev when unset', () => {
    expect(resolveApiBase({ VITE_API_URL: '', DEV: true })).toBe('http://localhost:8080');
  });

  it('falls back to same-origin (empty base) in production when unset', () => {
    expect(resolveApiBase({ VITE_API_URL: '', DEV: false })).toBe('');
  });
});
