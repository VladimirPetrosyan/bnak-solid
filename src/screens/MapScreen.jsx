import { For, Show, onCleanup, createEffect, createMemo, createSignal } from 'solid-js';
import { state, setState, t, txt, li, visible, cardOf, cityObj, cityK, openListing, go, shortPrice, statusOf, INK, TEAL } from '../store';
import { YANDEX_MAPS_KEY, yandexLocale, canUseYandex, markerState, yandexHostVisible, mapErrorDetailKey } from '../mapProvider';
import { loadYandexMaps } from '../yandexMapsLoader';
import { createYandexEngine, markerStyle, filterListingsByBounds } from '../mapEngine';
import { parseCoords, viewUrl } from '../listingLocation';
import PhotoSlot from '../components/PhotoSlot';
import Icon from '../components/Icon';

export default function MapScreen() {
  let host;
  let engine = null;
  const [status, setStatus] = createSignal('loading');
  const [errCode, setErrCode] = createSignal(null);
  const [retryTick, setRetryTick] = createSignal(0);
  const [bounds, setBounds] = createSignal(null);
  const [mView, setMView] = createSignal('map');
  const showList = () => !state.isMob || mView() === 'list';
  const showMap = () => !state.isMob || mView() === 'map';
  const cityMapUrl = () => viewUrl(parseCoords(cityObj().ll), cityObj().z);
  const mapLocale = createMemo(() => yandexLocale(state.lang));
  const canMapUse = createMemo(() => canUseYandex(state.lang, YANDEX_MAPS_KEY));
  const mapVisible = createMemo(() => filterListingsByBounds(visible(), bounds()));
  const devDetail = createMemo(() => (import.meta.env.DEV ? mapErrorDetailKey(errCode()) : null));

  function destroyEngine() {
    if (engine) engine.destroy();
    engine = null;
  }

  function retry() {
    setRetryTick((n) => n + 1);
  }

  createEffect(() => {
    const locale = mapLocale();
    const usable = canMapUse();
    const center = cityObj().ll;
    const zoom = cityObj().z;
    retryTick();
    destroyEngine();
    setBounds(null);
    let cancelled = false;

    if (!usable) {
      setStatus('error');
      setErrCode('no-key');
      return;
    }

    setStatus('loading');
    setErrCode(null);
    loadYandexMaps(YANDEX_MAPS_KEY, locale)
      .then((ymaps3) => {
        if (cancelled || !host) return;
        try {
          engine = createYandexEngine(ymaps3, host, { center, zoom });
          setStatus('yandex');
          setTimeout(() => {
            if (!engine) return;
            engine.invalidate();
            setBounds(engine.getBounds());
          }, 120);
        } catch {
          engine = null;
          setStatus('error');
          setErrCode('init-error');
        }
      })
      .catch((err) => {
        if (cancelled || (err && err.code === 'superseded')) return;
        setStatus('error');
        setErrCode((err && err.code) || 'script-error');
      });

    onCleanup(() => {
      cancelled = true;
      destroyEngine();
    });
  });

  createEffect(() => {
    const c = cityObj();
    cityK();
    status();
    if (engine) engine.setView(c.ll, c.z);
  });

  createEffect(() => {
    const list = visible();
    const active = state.active;
    li();
    status();
    if (!engine) return;
    engine.setMarkers(
      list,
      (l) => ({ ...markerStyle(markerState(l, active, statusOf(l)), INK, TEAL), text: shortPrice(l) }),
      (id) => openListing(id)
    );
  });

  createEffect(() => {
    status();
    if (showMap() && engine) setTimeout(() => engine.invalidate(), 60);
  });

  return (
    <div style="width:100%;max-width:1400px;margin:0 auto;padding:20px clamp(14px,3vw,28px) 40px;animation:bnIn .2s ease">
      <Show when={state.isMob}>
        <div style="display:flex;gap:3px;padding:4px;background:#f2f1ee;border-radius:14px;margin-bottom:14px">
          <button
            type="button"
            class="bn-tap"
            onClick={() => setMView('map')}
            aria-pressed={mView() === 'map'}
            style={`flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:11px;font-size:14px;font-weight:700;background:${mView() === 'map' ? '#fff' : 'transparent'};color:${mView() === 'map' ? '#1c1b19' : '#6f6d68'};box-shadow:${mView() === 'map' ? '0 1px 3px rgba(28,27,25,.14)' : 'none'}`}
          >
            <Icon name="map" size={15} weight={1.9} />
            <span>{t().mapW}</span>
          </button>
          <button
            type="button"
            class="bn-tap"
            onClick={() => {
              if (engine) setBounds(engine.getBounds());
              setMView('list');
            }}
            aria-pressed={mView() === 'list'}
            style={`flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border-radius:11px;font-size:14px;font-weight:700;background:${mView() === 'list' ? '#fff' : 'transparent'};color:${mView() === 'list' ? '#1c1b19' : '#6f6d68'};box-shadow:${mView() === 'list' ? '0 1px 3px rgba(28,27,25,.14)' : 'none'}`}
          >
            <Icon name="list" size={15} weight={1.9} />
            <span>{txt('mapLive', { n: mapVisible().length })}</span>
          </button>
        </div>
      </Show>

      <div style="display:flex;gap:16px;align-items:stretch;flex-wrap:wrap">
        <Show when={showList()}>
          <div style="flex:1 1 360px;max-width:440px;min-width:280px;background:#fff;border-radius:18px;box-shadow:0 1px 2px rgba(28,27,25,.05);display:flex;flex-direction:column;max-height:76vh;overflow:hidden">
            <Show when={!state.isMob}>
              <div style="padding:18px 20px;border-bottom:1px solid #f0efec;display:flex;align-items:center;gap:12px">
                <div style="flex:1">
                  <div style="font-size:18px;font-weight:800;letter-spacing:-.02em">{txt('mapLive', { n: mapVisible().length })}</div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">
                    {cityObj().n[li()]} · {t().mapSub}
                  </div>
                </div>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => go('search')}
                  style="padding:9px 14px;border-radius:11px;background:#f2f1ee;font-size:13px;font-weight:700;white-space:nowrap"
                >
                  {t().asList}
                </button>
              </div>
            </Show>

            <div style="overflow-y:auto;flex:1">
              <For each={mapVisible()}>
                {(l) => {
                  const c = () => cardOf(l);
                  const selectOnMap = () => {
                    setState('active', l.id);
                    if (engine) engine.setView(l.ll, 15);
                  };
                  return (
                    <div
                      role="button"
                      tabindex="0"
                      onClick={selectOnMap}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectOnMap();
                        }
                      }}
                      style={`display:flex;gap:13px;padding:14px 18px;cursor:pointer;border-bottom:1px solid #f4f3f0;background:${state.active === l.id ? '#f7f7f6' : 'transparent'}`}
                    >
                      <div style="flex:0 0 100px;height:78px;border-radius:12px;overflow:hidden;background:#f2f1ee;position:relative">
                        <PhotoSlot id={c().slot} label={c().addr} src={c().photo} />
                      </div>
                      <div style="min-width:0;flex:1">
                        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px">
                          <span style="font-size:18px;font-weight:800;letter-spacing:-.02em">{c().price}</span>
                          <span
                            style={`font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;white-space:nowrap;color:${c().chipFg};background:${c().chipBg}`}
                          >
                            {c().chipShort}
                          </span>
                        </div>
                        <div style="font-size:13px;font-weight:700;margin-top:5px">{c().title}</div>
                        <div style="font-size:13px;color:#6f6d68;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          {c().addr}
                        </div>
                        <button
                          type="button"
                          class="bn-tap"
                          onClick={(e) => {
                            e.stopPropagation();
                            openListing(l.id);
                          }}
                          style="margin-top:7px;display:inline-flex;padding:6px 11px;border-radius:9px;background:#f2f1ee;font-size:12px;font-weight:700"
                        >
                          {t().viewBtn}
                        </button>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>

        <div
          style={`flex:999 1 520px;min-width:280px;position:relative;border-radius:18px;overflow:hidden;background:#eceae5;min-height:${state.isMob ? '58vh' : '520px'};max-height:76vh;box-shadow:0 1px 2px rgba(28,27,25,.05);display:${showMap() ? 'block' : 'none'}`}
        >
          <div ref={host} class="bn-yamap" style={`position:absolute;inset:0;display:${yandexHostVisible(status()) ? 'block' : 'none'}`} />
          <Show when={status() === 'loading'}>
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#9a9793;background:#eceae5">
              {t().locationLoading}
            </div>
          </Show>
          <Show when={status() === 'error'}>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center;background:#eceae5">
              <Icon name="alert" size={20} stroke="#9a9793" />
              <div style="font-size:13px;color:#9a9793">{t().locationMapUnavailable}</div>
              <Show when={devDetail()}>
                <div style="font-size:11px;color:#b3b0ab">{t()[devDetail()]}</div>
              </Show>
              <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                <Show when={cityMapUrl()}>
                  <a
                    href={cityMapUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:11px;background:#fff;color:#1c1b19;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 1px 2px rgba(28,27,25,.08)"
                  >
                    <Icon name="map" size={14} stroke="#1c1b19" weight={2} />
                    <span>{t().locationOpenYandex}</span>
                  </a>
                </Show>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={retry}
                  style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:11px;background:#fff;color:#1c1b19;font-size:13px;font-weight:700;box-shadow:0 1px 2px rgba(28,27,25,.08)"
                >
                  <Icon name="refresh" size={14} stroke="#1c1b19" weight={2} />
                  <span>{t().locationRetry}</span>
                </button>
              </div>
            </div>
          </Show>
          <div style="position:absolute;bottom:14px;left:14px;z-index:500;display:flex;gap:14px;flex-wrap:wrap;padding:11px 15px;border-radius:14px;background:#fff;box-shadow:0 6px 20px -12px rgba(28,27,25,.45);font-size:12px">
            <span style="display:flex;align-items:center;gap:7px;font-weight:600">
              <span style="width:10px;height:10px;border-radius:999px;background:#1c1b19;display:block" />
              {t().legSelected}
            </span>
            <span style="display:flex;align-items:center;gap:7px;font-weight:600">
              <span style="width:10px;height:10px;border-radius:999px;background:#0e7c73;display:block" />
              {t().legFresh}
            </span>
            <span style="display:flex;align-items:center;gap:7px;font-weight:600">
              <span style="width:10px;height:10px;border-radius:999px;background:#fff;border:1.5px solid #c9c7c2;display:block" />
              {t().legAging}
            </span>
            <span style="display:flex;align-items:center;gap:7px;font-weight:600">
              <span style="width:10px;height:10px;border-radius:999px;background:#0e7c73;border:1.5px solid #1c1b19;display:block" />
              {t().legVip}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
