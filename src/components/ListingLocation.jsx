import { Show, createSignal, createEffect, createMemo, onCleanup } from 'solid-js';
import { state, t } from '../store';
import Icon from './Icon';
import { parseCoords, viewUrl, searchUrl } from '../listingLocation';
import { YANDEX_MAPS_KEY, yandexLocale, canUseYandex, yandexHostVisible, mapErrorDetailKey } from '../mapProvider';
import { loadYandexMaps } from '../yandexMapsLoader';
import { createYandexPointMap } from '../mapEngine';

export default function ListingLocation(props) {
  const coords = () => parseCoords(props.ll);
  const [status, setStatus] = createSignal('idle');
  const [errCode, setErrCode] = createSignal(null);
  const [retryTick, setRetryTick] = createSignal(0);
  const mapLocale = createMemo(() => yandexLocale(state.lang));
  const canMapUse = createMemo(() => canUseYandex(state.lang, YANDEX_MAPS_KEY));
  const devDetail = createMemo(() => (import.meta.env.DEV ? mapErrorDetailKey(errCode()) : null));
  let host;
  let map;

  function destroyMap() {
    if (map) {
      map.destroy();
      map = null;
    }
  }

  function retry() {
    setRetryTick((n) => n + 1);
  }

  createEffect(() => {
    const c = coords();
    const locale = mapLocale();
    const usable = canMapUse();
    retryTick();
    destroyMap();
    if (!c) {
      setStatus('none');
      setErrCode(null);
      return;
    }
    if (!usable) {
      setStatus('error');
      setErrCode('no-key');
      return;
    }
    setStatus('loading');
    setErrCode(null);
    let cancelled = false;
    loadYandexMaps(YANDEX_MAPS_KEY, locale)
      .then((ymaps3) => {
        if (cancelled || !host) return;
        try {
          map = createYandexPointMap(ymaps3, host, { lat: c.lat, lng: c.lng });
          setStatus('yandex');
        } catch {
          destroyMap();
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
      destroyMap();
    });
  });

  return (
    <div style="margin-top:26px">
      <h2 style="margin:0 0 14px;font-size:21px;font-weight:800;letter-spacing:-.02em">{t().locationTitle}</h2>
      <div style="background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
        <div style="display:flex;align-items:center;gap:8px;font-size:15px;color:#4a4844">
          <Icon name="pin" size={17} stroke="#9a9793" />
          <span>{props.address}</span>
        </div>
        <Show
          when={coords()}
          fallback={
            <>
              <div style="margin-top:8px;font-size:13px;color:#9a9793">{t().locationNoCoords}</div>
              <a
                href={searchUrl(props.address)}
                target="_blank"
                rel="noopener noreferrer"
                style="margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:13px;background:#f2f1ee;color:#1c1b19;font-size:13.5px;font-weight:700;cursor:pointer;text-decoration:none"
              >
                <Icon name="search" size={15} stroke="#1c1b19" weight={2} />
                <span>{t().locationSearchCta}</span>
              </a>
            </>
          }
        >
          <div style="margin-top:14px;border-radius:14px;overflow:hidden;aspect-ratio:16/9;background:#eceae5;position:relative">
            <div ref={host} style={`position:absolute;inset:0;display:${yandexHostVisible(status()) ? 'block' : 'none'}`} />
            <Show when={status() === 'loading'}>
              <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#9a9793">
                {t().locationLoading}
              </div>
            </Show>
            <Show when={status() === 'error'}>
              <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px;text-align:center">
                <Icon name="alert" size={20} stroke="#9a9793" />
                <div style="font-size:13px;color:#9a9793">{t().locationMapUnavailable}</div>
                <Show when={devDetail()}>
                  <div style="font-size:11px;color:#b3b0ab">{t()[devDetail()]}</div>
                </Show>
                <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
                  <a
                    href={viewUrl(coords())}
                    target="_blank"
                    rel="noopener noreferrer"
                    style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:11px;background:#fff;color:#1c1b19;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:none;box-shadow:0 1px 2px rgba(28,27,25,.08)"
                  >
                    <Icon name="map" size={14} stroke="#1c1b19" weight={2} />
                    <span>{t().locationOpenYandex}</span>
                  </a>
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={retry}
                    style="display:flex;align-items:center;gap:7px;padding:9px 14px;border-radius:11px;background:#fff;color:#1c1b19;font-size:12.5px;font-weight:700;box-shadow:0 1px 2px rgba(28,27,25,.08)"
                  >
                    <Icon name="refresh" size={14} stroke="#1c1b19" weight={2} />
                    <span>{t().locationRetry}</span>
                  </button>
                </div>
              </div>
            </Show>
          </div>
          <a
            href={viewUrl(coords())}
            target="_blank"
            rel="noopener noreferrer"
            style="margin-top:12px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:13px;background:#f2f1ee;color:#1c1b19;font-size:13.5px;font-weight:700;cursor:pointer;text-decoration:none"
          >
            <Icon name="map" size={15} stroke="#1c1b19" weight={2} />
            <span>{t().locationOpenCta}</span>
          </a>
        </Show>
      </div>
    </div>
  );
}
