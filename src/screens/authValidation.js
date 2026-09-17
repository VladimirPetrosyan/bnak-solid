export function singleFieldInvalid(name, ok) {
  return ok ? [] : [name];
}

export function entryInvalidFields({ phoneOk, hasPassword }) {
  const bad = [];
  if (!phoneOk) bad.push('phone');
  if (!hasPassword) bad.push('password');
  return bad;
}

export function passwordStepInvalidFields({ pwOk, matches }) {
  const bad = [];
  if (!pwOk) bad.push('password');
  if (!matches) bad.push('confirm');
  return bad;
}
