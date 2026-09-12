import { readMigrated, safeSet } from './storage';

const KEY = 'hayhome.browserId';
const LEGACY_KEY = 'bnak.browserId';
const ID_RE = /^[0-9a-f]{32}$/;

export function genBrowserId() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getBrowserId(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return genBrowserId();
  const existing = readMigrated(storage, KEY, LEGACY_KEY);
  if (existing && ID_RE.test(existing)) {
    safeSet(storage, KEY, existing);
    return existing;
  }
  const id = genBrowserId();
  safeSet(storage, KEY, id);
  return id;
}
