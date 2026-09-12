import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
const jsx = readFileSync(fileURLToPath(new URL('./screens/Favs.jsx', import.meta.url)), 'utf8');

const cardRule = html.match(/\.bn-fav-card\s*{[^}]*}/)[0];
const mobileBlock = html.match(/@media \(min-width: 600px\) {([\s\S]*?)\n {6}}\n/)[0];

describe('favorites card grid', () => {
  it('uses a fixed status column width so it does not shift with chip/text length', () => {
    expect(cardRule).toContain('grid-template-columns: 72px minmax(0, 1fr) 38px');
    expect(mobileBlock).toContain('grid-template-columns: 152px minmax(0, 1fr) 160px 38px');
  });

  it('keeps the photo, info, status and delete tracks in the same column order on desktop', () => {
    expect(mobileBlock).toContain("grid-template-areas: 'photo info status del'");
  });

  it('reflows status and delete onto their own shared row on mobile, not next to the photo', () => {
    expect(cardRule).toContain("grid-template-areas: 'photo info info' 'photo status del'");
  });

  it('never shrinks the delete target below 38px on either breakpoint', () => {
    expect(jsx).toContain('width:38px;height:38px');
    expect(mobileBlock).toContain('38px');
  });

  it('gives the info and status tracks min-width:0 so long text wraps instead of overflowing', () => {
    expect(html).toMatch(/\.bn-fav-info\s*{\s*grid-area: info;\s*min-width: 0;/);
    expect(html).toMatch(/\.bn-fav-status\s*{\s*grid-area: status;\s*min-width: 0;/);
  });

  it('Favs.jsx no longer sizes the status column from its own content', () => {
    expect(jsx).not.toMatch(/flex:0 1 auto;max-width:210px/);
    expect(jsx).toContain('class="bn-fav-status"');
  });
});
