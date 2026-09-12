const MARGIN = 12;
const MAX_WIDTH = 260;
const MIN_WIDTH = 180;

export function tooltipWidth(viewportWidth) {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, viewportWidth - MARGIN * 2));
}

export function tooltipLeft(anchorCenter, width, viewportWidth) {
  let left = anchorCenter - width / 2;
  left = Math.min(left, viewportWidth - MARGIN - width);
  left = Math.max(MARGIN, left);
  return left;
}

export function shouldCloseOnKey(key) {
  return key === 'Escape';
}

export function isOutside(target, ...nodes) {
  return nodes.every((n) => !n || !n.contains(target));
}

export function tooltipAriaProps(open, id) {
  return { expanded: open, describedby: open ? id : undefined };
}
