import { For, Show } from 'solid-js';
import { cardOf, openListing, toggleFav, openReport, t, TEAL } from '../store';
import PhotoSlot from './PhotoSlot';
import Icon from './Icon';

export default function ListingCard(props) {
  const c = () => cardOf(props.listing);

  return (
    <article class="bn-card" style="background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 1px 2px rgba(28,27,25,.05);animation:bnUp .26s ease both;transition:box-shadow .18s,transform .18s;display:flex;flex-direction:column">
      <div style="position:relative;height:212px;background:#f2f1ee">
        <PhotoSlot id={c().slot} label={c().addr} src={c().photo} />
        <button
          type="button"
          onClick={() => openListing(c().id)}
          aria-label={`${t().viewBtn}: ${c().addr}, ${c().price}`}
          style="position:absolute;inset:0;width:100%;height:100%"
        />
        <div style="position:absolute;bottom:10px;right:10px;padding:5px 10px;border-radius:999px;background:rgba(28,27,25,.62);color:#fff;font-size:11px;font-weight:600;pointer-events:none">
          {c().photosLabel}
        </div>
        <div
          style={`position:absolute;top:12px;left:12px;display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;white-space:nowrap;background:${c().chipBg};color:${c().chipFg};font-size:11.5px;font-weight:700;pointer-events:none;box-shadow:0 2px 8px -4px rgba(28,27,25,.5)`}
        >
          <span style={`width:7px;height:7px;border-radius:999px;background:${c().chipDot};display:block;animation:${c().chipAnim}`} />
          <span>{c().chipText}</span>
        </div>
        <button
          type="button"
          class="bn-tap"
          onClick={(e) => {
            e.stopPropagation();
            toggleFav(c().id);
          }}
          aria-label={t().favs}
          aria-pressed={c().fav}
          style="position:absolute;top:8px;right:8px;width:44px;height:44px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.92)"
        >
          <Icon name="heart" size={17} fill={c().fav ? TEAL : 'none'} stroke={c().fav ? TEAL : '#4a4844'} />
        </button>
      </div>

      <div style="padding:16px 18px 0;position:relative">
        <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">
          <span style="font-size:23px;font-weight:800;letter-spacing:-.03em">{c().price}</span>
          <span style="font-size:13.5px;font-weight:600;color:#6f6d68">{c().per}</span>
          <span style="margin-left:auto;font-size:12.5px;color:#9a9793">{c().alt}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">
          <For each={c().tags}>
            {(tag) => (
              <span style="padding:5px 10px;border-radius:999px;background:#f2f1ee;font-size:12px;font-weight:600;color:#4a4844">
                {tag}
              </span>
            )}
          </For>
        </div>
        <div style="margin-top:12px;display:flex;align-items:center;gap:7px;font-size:13.5px;color:#4a4844">
          <Icon name="pin" size={15} stroke="#9a9793" style="flex:0 0 auto" />
          <span>{c().addr}</span>
        </div>
        <div style="margin-top:4px;font-size:12.5px;color:#9a9793;padding-left:22px">{c().meta}</div>
      </div>

      <div style="margin:16px 18px 0;padding-top:13px;border-top:1px solid #f0efec;display:flex;align-items:center;gap:10px">
        <span
          style={`width:30px;height:30px;border-radius:999px;background:${c().avBg};color:${c().avFg};font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto`}
        >
          {c().initials}
        </span>
        <div style="min-width:0;flex:1">
          <div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{c().sellerLine}</div>
          <div style={`font-size:11.5px;color:${c().scoreFg};font-weight:600;margin-top:1px`}>{c().scoreText}</div>
        </div>
      </div>

      <Show when={c().warn}>
        <div style="margin:12px 18px 0;padding:10px 12px;border-radius:12px;background:#fceeeb;font-size:12px;line-height:1.45;color:#93331f;font-weight:600">
          {c().warnText}
        </div>
      </Show>

      <div style="display:flex;gap:8px;padding:14px 18px 18px;margin-top:auto">
        <button
          type="button"
          class="bn-tap"
          onClick={() => openListing(c().id)}
          style="flex:1;display:flex;align-items:center;justify-content:center;padding:11px;border-radius:12px;background:#f2f1ee;font-size:13.5px;font-weight:700"
        >
          {t().viewBtn}
        </button>
        <button
          type="button"
          class="bn-tap"
          onClick={(e) => {
            e.stopPropagation();
            openReport(c().id);
          }}
          style="display:flex;align-items:center;padding:11px 14px;border-radius:12px;border:1px solid #e8e7e4;font-size:13px;font-weight:600;color:#6f6d68;white-space:nowrap"
        >
          {t().alreadyTaken}
        </button>
      </div>
    </article>
  );
}
