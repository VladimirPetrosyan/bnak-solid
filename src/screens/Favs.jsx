import { For, Show } from 'solid-js';
import { state, t, txt, byId, cardOf, statusOf, agoOf, toggleFav, openListing, go, TEAL_T, TEAL_TX, SOFT, FAINT, INK } from '../store';
import PhotoSlot from '../components/PhotoSlot';
import Icon from '../components/Icon';

export default function Favs() {
  const items = () => Object.keys(state.favs).map(byId).filter(Boolean);
  const hasAlert = () => items().some((l) => ['archived', 'flagged', 'due'].includes(statusOf(l)));

  return (
    <div style="width:100%;max-width:1120px;margin:0 auto;padding:30px clamp(14px,3vw,28px) 48px;animation:bnIn .2s ease">
      <h1 style="margin:0 0 6px;font-size:clamp(24px,4vw,30px);font-weight:800;letter-spacing:-.03em">{t().favTitle}</h1>
      <div style="font-size:14.5px;color:#6f6d68;max-width:60ch">{t().favSub}</div>

      <Show when={items().length === 0}>
        <div style="margin-top:24px;background:#fff;border-radius:20px;padding:clamp(28px,5vw,52px);text-align:center;box-shadow:0 1px 2px rgba(28,27,25,.05)">
          <span style="width:58px;height:58px;border-radius:18px;background:#f2f1ee;display:inline-flex;align-items:center;justify-content:center">
            <Icon name="heart" size={26} stroke="#9a9793" weight={1.7} />
          </span>
          <div style="font-size:20px;font-weight:800;margin-top:16px;letter-spacing:-.02em">{t().favEmpty}</div>
          <div style="font-size:14.5px;color:#6f6d68;margin-top:7px;max-width:42ch;margin-left:auto;margin-right:auto">
            {t().favEmptyText}
          </div>
          <button
            type="button"
            class="bn-tap"
            onClick={() => go('search')}
            style="display:inline-flex;margin-top:20px;padding:13px 20px;border-radius:13px;background:#0e7c73;color:#fff;font-size:14px;font-weight:700"
          >
            {t().searchW}
          </button>
        </div>
      </Show>

      <Show when={hasAlert()}>
        <div style="margin-top:22px;display:flex;gap:14px;align-items:flex-start;padding:18px 20px;border-radius:16px;background:#fceeeb">
          <Icon name="alert" size={21} stroke="#c2452f" weight={2} style="flex:0 0 auto;margin-top:4px" />
          <div style="min-width:0">
            <div style="font-size:15.5px;font-weight:800;color:#93331f">{t().favAlertTitle}</div>
            <div style="font-size:13.5px;line-height:1.5;color:#93331f;margin-top:3px">{t().favAlertText}</div>
          </div>
        </div>
      </Show>

      <div style="margin-top:20px;display:flex;flex-direction:column;gap:12px">
        <For each={items()}>
          {(l) => {
            const c = () => cardOf(l);
            const archived = () => ['archived', 'flagged'].includes(statusOf(l));
            return (
              <div class="bn-fav-card" style={`opacity:${archived() ? 0.62 : 1}`}>
                <div class="bn-fav-photo" style="border-radius:14px;overflow:hidden;background:#f2f1ee;position:relative">
                  <PhotoSlot id={c().slot} label={c().addr} src={c().photo} />
                </div>
                <button type="button" onClick={() => openListing(l.id)} class="bn-fav-info" style="text-align:left">
                  <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
                    <span
                      style={`font-size:21px;font-weight:800;letter-spacing:-.02em;text-decoration:${archived() ? 'line-through' : 'none'};color:${archived() ? FAINT : INK}`}
                    >
                      {c().price}
                    </span>
                    <span style="font-size:13px;color:#6f6d68">{c().per}</span>
                  </div>
                  <div style="font-size:15px;font-weight:700;margin-top:5px">{c().title}</div>
                  <div style="font-size:13px;color:#6f6d68;margin-top:2px">
                    {c().addr} · {c().sellerLine}
                  </div>
                </button>
                <div class="bn-fav-status">
                  <span
                    style={`display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;font-size:11.5px;font-weight:700;background:${archived() ? SOFT : TEAL_T};color:${archived() ? FAINT : TEAL_TX}`}
                  >
                    {archived() ? t().archChip : t().inFeedChip}
                  </span>
                  <div style="font-size:12.5px;color:#6f6d68;margin-top:8px">
                    {archived() ? t().archNote2 : txt('checkedAt', { x: agoOf(l) })}
                  </div>
                </div>
                <button
                  type="button"
                  class="bn-fav-del bn-tap"
                  onClick={() => toggleFav(l.id)}
                  aria-label={t().removeW}
                  style="width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f7f7f6"
                >
                  <Icon name="close" size={15} stroke="#6f6d68" weight={2} />
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
