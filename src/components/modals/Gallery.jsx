import { For, Show } from 'solid-js';
import { state, setState, txt, byId, addrOf, t } from '../../store';
import PhotoSlot from '../PhotoSlot';
import Icon from '../Icon';
import { photoCount, stepIndex } from '../../galleryNav';

const COUNT = 5;

export default function Gallery() {
  const shot = () => state.gallery;
  const listing = () => byId(shot().id);
  const photos = () => (listing() && listing().photos) || null;
  const count = () => photoCount(photos(), COUNT);
  const move = (step) => (e) => {
    e.stopPropagation();
    setState('gallery', 'i', (i) => stepIndex(i, step, count()));
  };

  return (
    <Show when={state.gallery}>
      <div
        onClick={() => setState('gallery', null)}
        style="position:fixed;inset:0;z-index:400;background:rgba(20,19,18,.93);display:flex;flex-direction:column;padding:clamp(12px,2vw,24px);animation:bnIn .16s ease"
      >
        <div style="display:flex;align-items:center;gap:12px;color:#fff;flex:0 0 auto">
          <span style="font-size:14px;font-weight:700;letter-spacing:.02em">{txt('photoOf', { a: shot().i + 1, b: count() })}</span>
          <button
            type="button"
            class="bn-tap"
            onClick={() => setState('gallery', null)}
            aria-label={t().closeW}
            style="margin-left:auto;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.12)"
          >
            <Icon name="close" size={16} stroke="#fff" weight={2.2} />
          </button>
        </div>

        <div onClick={(e) => e.stopPropagation()} style="flex:1;min-height:0;display:flex;align-items:center;gap:16px;margin:16px 0">
          <button
            type="button"
            class="bn-tap"
            onClick={move(-1)}
            aria-label={t().galleryPrev}
            style="width:44px;height:44px;flex:0 0 auto;border-radius:999px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center"
          >
            <Icon name="back" size={18} stroke="#fff" weight={2.2} />
          </button>
          <div style="flex:1;height:100%;border-radius:20px;overflow:hidden;background:#26241f;position:relative">
            <PhotoSlot id={`ph-${shot().id}-${shot().i}`} label={addrOf(listing())} fit="contain" src={photos() && photos()[shot().i]} />
          </div>
          <button
            type="button"
            class="bn-tap"
            onClick={move(1)}
            aria-label={t().galleryNext}
            style="width:44px;height:44px;flex:0 0 auto;border-radius:999px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center"
          >
            <Icon name="next" size={18} stroke="#fff" weight={2.2} />
          </button>
        </div>

        <div onClick={(e) => e.stopPropagation()} style="flex:0 0 auto;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <For each={Array.from({ length: count() }, (_, i) => i)}>
            {(i) => (
              <button
                type="button"
                class="bn-tap"
                onClick={() => setState('gallery', 'i', i)}
                aria-label={`${t().galleryPhoto} ${i + 1}`}
                aria-pressed={shot().i === i}
                style={`width:88px;height:58px;border-radius:10px;overflow:hidden;position:relative;background:#26241f;opacity:${shot().i === i ? 1 : 0.45}`}
              >
                <PhotoSlot id={`ph-${shot().id}-${i}`} label={addrOf(listing())} src={photos() && photos()[i]} />
              </button>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
