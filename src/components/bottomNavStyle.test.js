import { describe, it, expect } from 'vitest';
import { bottomNavButtonStyle, bottomNavIconWrapStyle, bottomNavLabelStyle, bottomNavBadgeStyle } from './bottomNavStyle';

describe('bottomNavButtonStyle', () => {
  it('centers content on both axes and switches color by active state', () => {
    const on = bottomNavButtonStyle(true, '#0e7c73', '#9a9793');
    const off = bottomNavButtonStyle(false, '#0e7c73', '#9a9793');
    expect(on).toContain('align-items:center');
    expect(on).toContain('justify-content:center');
    expect(on).toContain('text-align:center');
    expect(on).toContain('color:#0e7c73');
    expect(off).toContain('color:#9a9793');
  });

  it('gives every button the same equal-area footprint regardless of state', () => {
    const on = bottomNavButtonStyle(true, '#0e7c73', '#9a9793');
    const off = bottomNavButtonStyle(false, '#0e7c73', '#9a9793');
    const strip = (s) => s.replace(/color:[^;]+/, '');
    expect(strip(on)).toBe(strip(off));
  });
});

describe('bottomNavLabelStyle', () => {
  it('stays centered even when the label wraps to two lines', () => {
    expect(bottomNavLabelStyle).toContain('text-align:center');
  });
});

describe('bottomNavIconWrapStyle', () => {
  it('is the positioning anchor the badge is placed against', () => {
    expect(bottomNavIconWrapStyle).toContain('position:relative');
  });
});

describe('bottomNavBadgeStyle', () => {
  it('anchors its own center to the icon corner so digit count cannot shift it', () => {
    expect(bottomNavBadgeStyle).toContain('left:100%');
    expect(bottomNavBadgeStyle).toContain('transform:translate(-50%,-50%)');
  });

  it('centers the number inside the circle', () => {
    expect(bottomNavBadgeStyle).toContain('align-items:center');
    expect(bottomNavBadgeStyle).toContain('justify-content:center');
  });

  it('keeps a round shape for 1 and 2 digit counts', () => {
    expect(bottomNavBadgeStyle).toContain('min-width:16px');
    expect(bottomNavBadgeStyle).toContain('height:16px');
    expect(bottomNavBadgeStyle).toContain('border-radius:999px');
  });
});
