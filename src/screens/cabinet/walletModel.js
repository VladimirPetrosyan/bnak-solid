const KIND_LABEL_KEYS = {
  signup: 'txKindSignup',
  profile_complete: 'txKindProfile',
  first_approved_listing: 'txKindApproved',
  cadastre_verified: 'txKindCadastre',
  quality_photos: 'txKindPhotos',
  vip_promote: 'txKindVip',
  mark_taken: 'txKindMarkTaken',
  useful_report: 'txKindUsefulReport'
};

export function clampProgress(balance, cost) {
  if (!cost || cost <= 0) return balance > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((balance / cost) * 100)));
}

export function canPromote(balance, cost) {
  return cost > 0 && balance >= cost;
}

export function vipShortfall(balance, cost) {
  if (!cost || cost <= 0) return 0;
  return Math.max(0, cost - balance);
}

export function vipTimeLeft(promotedUntil, nowMs) {
  if (!promotedUntil) return null;
  const end = new Date(promotedUntil).getTime();
  if (!Number.isFinite(end)) return null;
  const ms = end - nowMs;
  if (ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60
  };
}

export function txKindLabelKey(kind) {
  return KIND_LABEL_KEYS[kind] || 'txKindOther';
}

export function recentTransactions(transactions, limit = 5) {
  return (transactions || []).slice(0, limit).map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    labelKey: txKindLabelKey(tx.kind),
    createdAt: tx.createdAt
  }));
}
