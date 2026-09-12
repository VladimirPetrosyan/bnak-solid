export function promotedOf(list) {
  return list.filter((l) => l.promoted);
}

export function edgeState(metrics, epsilon = 2) {
  const scrollLeft = metrics?.scrollLeft || 0;
  const clientWidth = metrics?.clientWidth || 0;
  const scrollWidth = metrics?.scrollWidth || 0;
  if (scrollWidth <= clientWidth) return { atStart: true, atEnd: true };
  return {
    atStart: scrollLeft <= epsilon,
    atEnd: scrollLeft + clientWidth >= scrollWidth - epsilon
  };
}
