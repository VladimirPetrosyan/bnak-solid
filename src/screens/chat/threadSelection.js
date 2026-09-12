export function pickThreadKey(all, requestedKey) {
  if (requestedKey && all[requestedKey]) return requestedKey;
  const keys = Object.keys(all);
  return keys.length ? keys[0] : null;
}
