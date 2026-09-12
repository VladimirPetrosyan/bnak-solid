import { For, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { cardOf, openListing, t } from '../store';
import { edgeState } from '../vip';
import PhotoSlot from './PhotoSlot';
import Icon from './Icon';

const CARD_W = 230;
const GAP = 14;

export default function VipCarousel(props) {
  let track;
  let ro;
  const [atStart, setAtStart] = createSignal(true);
  const [atEnd, setAtEnd] = createSignal(true);

  const measure = () => {
    if (!track) return;
    const { atStart: s, atEnd: e } = edgeState(track);
    setAtStart(s);
    setAtEnd(e);
  };

  onMount(() => {
    measure();
    track.addEventListener('scroll', measure, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(track);
    }
  });
  onCleanup(() => {
    if (track) track.removeEventListener('scroll', measure);
    if (ro) ro.disconnect();
  });

  createEffect(() => {
    props.items.length;
    queueMicrotask(measure);
  });

  const scrollBy = (dir) => {
    if (!track) return;
    track.scrollBy({ left: dir * (CARD_W + GAP) * 2, behavior: 'smooth' });
  };

  return (
    <section style="margin-top:22px;background:#fff;border-radius:20px;padding:clamp(16px,2.4vw,22px);box-shadow:0 1px 2px rgba(28,27,25,.05)">
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:14px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:19px;font-weight:800;letter-spacing:-.02em">{t().vipTitle}</h2>
          <div style="font-size:13px;color:#6f6d68;margin-top:4px">{t().vipSub}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button
            type="button"
            aria-label={t().vipPrev}
            disabled={atStart()}
            onClick={() => scrollBy(-1)}
            style={`width:36px;height:36px;border-radius:999px;border:1px solid #e8e7e4;background:#fff;display:flex;align-items:center;justify-content:center;cursor:${atStart() ? 'default' : 'pointer'};opacity:${atStart() ? 0.4 : 1};transition:opacity .15s`}
          >
            <Icon name="back" size={15} weight={2} />
          </button>
          <button
            type="button"
            aria-label={t().vipNext}
            disabled={atEnd()}
            onClick={() => scrollBy(1)}
            style={`width:36px;height:36px;border-radius:999px;border:1px solid #e8e7e4;background:#fff;display:flex;align-items:center;justify-content:center;cursor:${atEnd() ? 'default' : 'pointer'};opacity:${atEnd() ? 0.4 : 1};transition:opacity .15s`}
          >
            <Icon name="next" size={15} weight={2} />
          </button>
          <button
            type="button"
            onClick={props.onAll}
            style="margin-left:6px;padding:9px 16px;border-radius:999px;background:#0e7c73;color:#fff;font-size:13px;font-weight:700"
          >
            {t().vipAll}
          </button>
        </div>
      </div>

      <div
        ref={track}
        class="bn-vip-track"
        style="display:flex;gap:14px;margin-top:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:4px"
      >
        <For each={props.items}>
          {(listing) => {
            const c = () => cardOf(listing);
            return (
              <button
                type="button"
                onClick={() => openListing(c().id)}
                aria-label={c().addr}
                class="bn-vip-card"
                style="flex:0 0 auto;width:230px;scroll-snap-align:start;text-align:left;background:#fff;border:1px solid #f0efec;border-radius:16px;overflow:hidden"
              >
                <div style="position:relative;height:150px;background:#f2f1ee">
                  <PhotoSlot id={'vip-' + c().id} label={c().addr} src={c().photo} />
                  <span style="position:absolute;top:8px;left:8px;padding:4px 9px;border-radius:999px;background:#0e7c73;color:#fff;font-size:10.5px;font-weight:800;letter-spacing:.03em">
                    VIP
                  </span>
                </div>
                <div style="padding:12px 13px 14px">
                  <div style="font-size:16.5px;font-weight:800;letter-spacing:-.02em">{c().price}</div>
                  <div style="font-size:12px;color:#6f6d68;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    {c().addr}
                  </div>
                </div>
              </button>
            );
          }}
        </For>
      </div>
    </section>
  );
}
