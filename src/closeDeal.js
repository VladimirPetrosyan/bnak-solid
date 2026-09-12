export const OUTCOME_SOURCES = ['bnak', 'other_platform', 'referral', 'offline', 'other'];

export function isValidOutcomeSource(source) {
  return OUTCOME_SOURCES.includes(source);
}

export function closeDealDuration(createdAt, now = new Date()) {
  const created = new Date(createdAt).getTime();
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(nowMs) || nowMs <= created) {
    return { unit: 'lessHour', value: 0 };
  }
  const hours = Math.floor((nowMs - created) / 3600000);
  if (hours < 1) return { unit: 'lessHour', value: 0 };
  if (hours < 24) return { unit: 'hours', value: hours };
  return { unit: 'days', value: Math.floor(hours / 24) };
}
