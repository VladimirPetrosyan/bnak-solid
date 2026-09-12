import { describe, it, expect } from 'vitest';
import { tooltipWidth, tooltipLeft, shouldCloseOnKey, isOutside, tooltipAriaProps } from './infoTooltipLayout';

describe('tooltipWidth', () => {
  it('caps at the max width on wide viewports', () => {
    expect(tooltipWidth(1024)).toBe(260);
    expect(tooltipWidth(783)).toBe(260);
  });

  it('shrinks to fit narrow viewports with margin on both sides', () => {
    const w = tooltipWidth(375);
    expect(w).toBeLessThanOrEqual(375 - 24);
  });
});

describe('tooltipLeft', () => {
  const viewports = [375, 783, 1024];

  it('never lets the popover cross the left or right edge for a centered anchor', () => {
    viewports.forEach((vw) => {
      const w = tooltipWidth(vw);
      const left = tooltipLeft(vw / 2, w, vw);
      expect(left).toBeGreaterThanOrEqual(12);
      expect(left + w).toBeLessThanOrEqual(vw - 12 + 0.0001);
    });
  });

  it('clamps to the left margin when the anchor sits near the left edge', () => {
    viewports.forEach((vw) => {
      const w = tooltipWidth(vw);
      const left = tooltipLeft(10, w, vw);
      expect(left).toBe(12);
    });
  });

  it('clamps to the right margin when the anchor sits near the right edge', () => {
    viewports.forEach((vw) => {
      const w = tooltipWidth(vw);
      const left = tooltipLeft(vw - 10, w, vw);
      expect(left + w).toBeLessThanOrEqual(vw - 12);
    });
  });
});

describe('shouldCloseOnKey', () => {
  it('closes only on Escape', () => {
    expect(shouldCloseOnKey('Escape')).toBe(true);
    expect(shouldCloseOnKey('Enter')).toBe(false);
    expect(shouldCloseOnKey('Tab')).toBe(false);
  });
});

describe('isOutside', () => {
  const inside = { contains: (t) => t === 'inside' };
  const other = { contains: (t) => t === 'other' };

  it('is false when the target is inside any given node', () => {
    expect(isOutside('inside', inside, other)).toBe(false);
    expect(isOutside('other', inside, other)).toBe(false);
  });

  it('is true when the target is inside none of the nodes', () => {
    expect(isOutside('elsewhere', inside, other)).toBe(true);
  });

  it('treats missing nodes as not containing the target', () => {
    expect(isOutside('elsewhere', null, undefined)).toBe(true);
  });
});

describe('tooltipAriaProps', () => {
  it('exposes aria-describedby only while open', () => {
    expect(tooltipAriaProps(true, 'tip-1')).toEqual({ expanded: true, describedby: 'tip-1' });
    expect(tooltipAriaProps(false, 'tip-1')).toEqual({ expanded: false, describedby: undefined });
  });
});
