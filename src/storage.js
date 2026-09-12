export function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {}
}

export function safeRemove(storage, key) {
  try {
    storage.removeItem(key);
  } catch {}
}

export function readMigrated(storage, newKey, oldKey) {
  const next = safeGet(storage, newKey);
  if (next !== null) return next;
  return safeGet(storage, oldKey);
}
