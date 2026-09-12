import { describe, it, expect } from 'vitest';
import { cabinetPillStyle } from './headerStyle';

describe('cabinetPillStyle', () => {
  it('is a centered, symmetric square on mobile so the avatar does not shift next to the plus button', () => {
    const s = cabinetPillStyle(true);
    expect(s).toContain('justify-content:center');
    expect(s).toContain('width:40px');
    expect(s).toContain('height:40px');
    expect(s).not.toMatch(/padding:0 12px 0 4px/);
  });

  it('keeps the wider label-bearing pill on desktop', () => {
    const s = cabinetPillStyle(false);
    expect(s).toContain('padding:0 12px 0 4px');
    expect(s).toContain('gap:8px');
  });
});
