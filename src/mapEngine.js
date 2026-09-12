import { sanitizeLabel } from './mapProvider';

function markerCss(bg, fg, border) {
  return `display:flex;align-items:center;justify-content:center;height:30px;padding:0 12px;border-radius:999px;background:${bg};color:${fg};font:700 12.5px Manrope,system-ui,sans-serif;white-space:nowrap;box-shadow:0 4px 12px -4px rgba(28,27,25,.55);border:${border}`;
}

export function markerStyle({ selected, fresh, vip }, INK, TEAL) {
  const bg = selected ? INK : fresh ? TEAL : '#fff';
  const fg = selected || fresh ? '#fff' : INK;
  const border = vip ? `1.5px solid ${INK}` : '1px solid rgba(28,27,25,.08)';
  return { bg, fg, border };
}

export function isValidBounds(b) {
  return Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[0] < b[2] && b[1] < b[3];
}

export function filterListingsByBounds(list, bounds) {
  if (!isValidBounds(bounds)) return list;
  const [swLat, swLng, neLat, neLng] = bounds;
  return list.filter((l) => {
    const ll = l && l.ll;
    if (!Array.isArray(ll) || ll.length !== 2 || !Number.isFinite(ll[0]) || !Number.isFinite(ll[1])) return false;
    return ll[0] >= swLat && ll[0] <= neLat && ll[1] >= swLng && ll[1] <= neLng;
  });
}

export function createYandexPointMap(ymaps3, host, { lat, lng, zoom = 16 }) {
  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
  const map = new YMap(host, { location: { center: [lng, lat], zoom } });
  try {
    map.addChild(new YMapDefaultSchemeLayer());
    map.addChild(new YMapDefaultFeaturesLayer());
    const el = document.createElement('div');
    el.style.cssText =
      'width:18px;height:18px;border-radius:999px;background:#1c1b19;border:3px solid #fff;box-shadow:0 2px 8px rgba(28,27,25,.4)';
    map.addChild(new YMapMarker({ coordinates: [lng, lat] }, el));
    return map;
  } catch (err) {
    try {
      map.destroy();
    } catch {}
    throw err;
  }
}

export function createYandexEngine(ymaps3, host, { center, zoom }) {
  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = ymaps3;
  const map = new YMap(host, { location: { center: [center[1], center[0]], zoom } });
  try {
    map.addChild(new YMapDefaultSchemeLayer());
    map.addChild(new YMapDefaultFeaturesLayer());
  } catch (err) {
    try {
      map.destroy();
    } catch {}
    throw err;
  }
  let markers = [];

  function readBounds() {
    try {
      const b = map.bounds;
      if (!Array.isArray(b) || b.length !== 2) return null;
      const [[swLng, swLat], [neLng, neLat]] = b;
      if (![swLng, swLat, neLng, neLat].every(Number.isFinite)) return null;
      if (swLat >= neLat || swLng >= neLng) return null;
      return [swLat, swLng, neLat, neLng];
    } catch {
      return null;
    }
  }

  return {
    setView(center, zoom) {
      try {
        map.setLocation({ center: [center[1], center[0]], zoom });
      } catch {}
    },
    invalidate() {},
    getBounds() {
      return readBounds();
    },
    setMarkers(list, describe, onClick) {
      try {
        markers.forEach((m) => map.removeChild(m));
        markers = list.map((l) => {
          const { bg, fg, border, text } = describe(l);
          const safe = sanitizeLabel(text);
          const el = document.createElement('div');
          el.style.cssText = markerCss(bg, fg, border);
          el.textContent = safe;
          el.addEventListener('click', () => onClick(l.id));
          const marker = new YMapMarker({ coordinates: [l.ll[1], l.ll[0]] }, el);
          map.addChild(marker);
          return marker;
        });
      } catch {
        markers = [];
      }
    },
    destroy() {
      try {
        markers.forEach((m) => map.removeChild(m));
        map.destroy();
      } catch {}
      markers = [];
    }
  };
}
