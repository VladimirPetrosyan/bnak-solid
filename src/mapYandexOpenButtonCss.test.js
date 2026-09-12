import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');

function extractYamapHideSelector(css) {
  const m = css.match(/(\.bn-yamap\s+[^{}]+)\{\s*display:\s*none;?\s*\}/);
  return m ? m[1].trim() : null;
}

function parseCompound(part) {
  const tag = (part.match(/^[a-zA-Z][\w-]*/) || [null])[0];
  const classes = [...part.matchAll(/\.([-\w]+)/g)].map((m) => m[1]);
  return { tag, classes };
}

function parseSelector(selector) {
  return selector.trim().split(/\s+/).map(parseCompound);
}

function compoundMatches(el, compound) {
  if (compound.tag && el.tag !== compound.tag) return false;
  const classList = (el.class || '').split(/\s+/).filter(Boolean);
  return compound.classes.every((c) => classList.includes(c));
}

function chainMatches(chain, parts) {
  const el = chain[chain.length - 1];
  if (!compoundMatches(el, parts[parts.length - 1])) return false;
  let sIdx = parts.length - 2;
  for (let i = chain.length - 2; i >= 0 && sIdx >= 0; i--) {
    if (compoundMatches(chain[i], parts[sIdx])) sIdx--;
  }
  return sIdx < 0;
}

function collectMatches(root, parts, chain = []) {
  const nextChain = [...chain, root];
  const matches = chainMatches(nextChain, parts) ? [root] : [];
  for (const child of root.children || []) matches.push(...collectMatches(child, parts, nextChain));
  return matches;
}

function controlButton(text, extraNesting = false) {
  const button = { tag: 'button', class: 'ymaps3--button ymaps3--control-button', text };
  const background = { tag: 'div', class: 'ymaps3--control ymaps3--control__background', children: [button] };
  return extraNesting ? { tag: 'div', class: 'ymaps3--control-wrap', children: [background] } : background;
}

function liveTreeFixture(promoText, extraNesting = false) {
  return {
    tag: 'div',
    class: 'bn-yamap',
    children: [
      {
        tag: 'div',
        class: 'ymaps3--map-container',
        children: [
          {
            tag: 'div',
            class: 'ymaps3--controls ymaps3--controls_bottom ymaps3--controls_left ymaps3--controls_horizontal',
            children: [controlButton(promoText, extraNesting)]
          },
          {
            tag: 'div',
            class: 'ymaps3--controls ymaps3--controls_bottom ymaps3--controls_right ymaps3--controls_horizontal',
            children: [controlButton('zoom in')]
          },
          {
            tag: 'div',
            class: 'ymaps3--controls ymaps3--controls_top ymaps3--controls_right ymaps3--controls_horizontal',
            children: [controlButton('geolocation')]
          },
          {
            tag: 'div',
            class: 'ymaps3x5--map-copyrights ymaps3--copyrights-pane',
            children: [
              { tag: 'a', class: 'ymaps3x5--map-copyrights__link', text: 'Яндекс Карты' },
              { tag: 'a', class: 'ymaps3x5--map-copyrights__link', text: 'Условия использования' }
            ]
          }
        ]
      }
    ]
  };
}

describe('yandex open-in-app promo button hiding', () => {
  const selector = extractYamapHideSelector(html);

  it('finds a scoped hide rule under .bn-yamap targeting a control button', () => {
    expect(selector).not.toBeNull();
    expect(selector).toMatch(/^\.bn-yamap\s/);
    expect(selector).toContain('controls_bottom');
    expect(selector).toContain('controls_left');
  });

  it.each([
    ['ru', 'Открыть Яндекс Карты'],
    ['en', 'Open Yandex Maps'],
    ['hy', 'Բացել Яндекс Քարտեզները']
  ])('hides the real bottom-left promo button regardless of its %s text', (_lang, text) => {
    const tree = liveTreeFixture(text);
    const parts = parseSelector(selector);
    const matched = collectMatches(tree, parts);
    expect(matched).toContainEqual(expect.objectContaining({ tag: 'button', text }));
  });

  it('still hides the promo button when Yandex adds extra wrapping nesting', () => {
    const tree = liveTreeFixture('Открыть Яндекс Карты', true);
    const parts = parseSelector(selector);
    const matched = collectMatches(tree, parts);
    expect(matched.some((el) => el.tag === 'button' && el.text === 'Открыть Яндекс Карты')).toBe(true);
  });

  it('never matches the copyrights or terms-of-use links', () => {
    const tree = liveTreeFixture('Открыть Яндекс Карты');
    const parts = parseSelector(selector);
    const matched = collectMatches(tree, parts);
    expect(matched.every((el) => el.tag !== 'a')).toBe(true);
  });

  it('never matches the bottom-right zoom control', () => {
    const tree = liveTreeFixture('Открыть Яндекс Карты');
    const parts = parseSelector(selector);
    const matched = collectMatches(tree, parts);
    expect(matched.some((el) => el.text === 'zoom in')).toBe(false);
  });

  it('never matches top controls', () => {
    const tree = liveTreeFixture('Открыть Яндекс Карты');
    const parts = parseSelector(selector);
    const matched = collectMatches(tree, parts);
    expect(matched.some((el) => el.text === 'geolocation')).toBe(false);
  });

  it('matches nothing when the map has no bottom-left controls group, without throwing', () => {
    const tree = { tag: 'div', class: 'bn-yamap', children: [{ tag: 'div', class: 'ymaps3--map-container', children: [] }] };
    const parts = parseSelector(selector);
    expect(() => collectMatches(tree, parts)).not.toThrow();
    expect(collectMatches(tree, parts)).toEqual([]);
  });

  it('the map host div carries the bn-yamap class', () => {
    const jsx = readFileSync(fileURLToPath(new URL('./screens/MapScreen.jsx', import.meta.url)), 'utf8');
    expect(jsx).toContain('class="bn-yamap"');
  });
});
