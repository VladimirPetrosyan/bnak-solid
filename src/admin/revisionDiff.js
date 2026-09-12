const FIELDS = [
  'deal',
  'city',
  'd',
  'street',
  'lat',
  'lng',
  'price',
  'rooms',
  'area',
  'fl',
  'fls',
  'f',
  'desc',
  'dep',
  'cadastreCode',
  'repairCondition'
];

function fieldsEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a || []) === JSON.stringify(b || []);
  }
  return (a ?? '') === (b ?? '');
}

export function revisionDiff(listing, proposed) {
  if (!listing || !proposed) return [];
  return FIELDS.filter((key) => !fieldsEqual(listing[key], proposed[key])).map((key) => ({
    key,
    before: listing[key],
    after: proposed[key]
  }));
}
