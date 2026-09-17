export function isSameSearch(a, b) {
  return a.deal === b.deal && a.city === b.city && String(a.rooms) === String(b.rooms) && String(a.priceMax || '') === String(b.priceMax || '');
}

export function findDuplicateSearch(list, filters) {
  return (list || []).some((s) => isSameSearch(s, filters));
}
