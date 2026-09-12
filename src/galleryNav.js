function toSafeInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function photoCount(photos, fallback) {
  return Array.isArray(photos) && photos.length > 0 ? photos.length : fallback;
}

export function galleryIndex(requested, photos, fallback = 5) {
  const count = toSafeInt(photoCount(photos, fallback));
  if (count <= 0) return 0;
  const safeRequested = toSafeInt(requested);
  return ((safeRequested % count) + count) % count;
}

export function stepIndex(i, step, count) {
  const safeCount = toSafeInt(count);
  if (safeCount <= 0) return 0;
  const safeI = toSafeInt(i);
  const safeStep = toSafeInt(step);
  return (((safeI + safeStep) % safeCount) + safeCount) % safeCount;
}

export function remainingPhotos(ph, shown = 3) {
  const n = Number(ph);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n) - shown);
}
