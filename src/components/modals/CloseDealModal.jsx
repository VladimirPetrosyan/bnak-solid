import { For, Show, onCleanup, onMount } from 'solid-js';
import { state, t, txt, byId, addrOf, closeDealSource, cancelCloseDeal, confirmCloseDeal, TEAL, FAINT } from '../../store';
import { OUTCOME_SOURCES, closeDealDuration } from '../../closeDeal';
import { overlay, modal, radio } from '../../theme';
import Icon from '../Icon';

const SOURCE_LABEL_KEY = {
  bnak: 'outcomeSrcBnak',
  other_platform: 'outcomeSrcOtherPlatform',
  referral: 'outcomeSrcReferral',
  offline: 'outcomeSrcOffline',
  other: 'outcomeSrcOther'
};

export default function CloseDealModal() {
  onMount(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') cancelCloseDeal();
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  const listing = () => state.closeDeal && byId(state.closeDeal.id);
  const title = () => (['rent', 'daily'].includes(listing()?.deal) ? t().closeDealTitleRent : t().closeDealTitleSale);
  const durationLabel = () => {
    const l = listing();
    if (!l) return '';
    const createdAt = l.createdAt || new Date(Date.now() - (l.ch || 0) * 3600000).toISOString();
    const d = closeDealDuration(createdAt);
    if (d.unit === 'lessHour') return txt('closeDealDurationLessHour');
    if (d.unit === 'hours') return txt('closeDealDurationHours', { n: d.value });
    return txt('closeDealDurationDays', { n: d.value });
  };
  const close = () => cancelCloseDeal();
  const ready = () => state.closeDeal && !!state.closeDeal.source;

  return (
    <Show when={state.closeDeal && listing()}>
      <div onClick={close} style={`${overlay};z-index:230;align-items:center`}>
        <div onClick={(e) => e.stopPropagation()} style={`${modal('320px')};padding:24px`}>
          <div style="display:flex;align-items:flex-start;gap:12px">
            <span style="width:40px;height:40px;border-radius:12px;background:#e8f4f2;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
              <Icon name="check" size={19} stroke="#0e7c73" weight={2.8} />
            </span>
            <div style="flex:1;min-width:0">
              <div style="font-size:17px;font-weight:800;letter-spacing:-.02em">{title()}</div>
              <div style="margin-top:2px;font-size:12.5px;color:#6f6d68">{addrOf(listing())}</div>
            </div>
            <button
              type="button"
              class="bn-tap"
              disabled={state.closeDeal.busy}
              onClick={close}
              aria-label={t().cancelW}
              style="width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#f7f7f6;flex:0 0 auto"
            >
              <Icon name="close" size={13} stroke="#4a4844" weight={2} />
            </button>
          </div>

          <div style="margin-top:12px;font-size:12px;color:#9a9793">{durationLabel()}</div>

          <div style="margin-top:16px;font-size:13px;font-weight:700;color:#4a4844">{t().closeDealSourceQ}</div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
            <For each={OUTCOME_SOURCES}>
              {(src) => {
                const r = () => radio(state.closeDeal.source === src);
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    aria-pressed={state.closeDeal.source === src}
                    onClick={() => closeDealSource(src)}
                    style={`display:flex;align-items:center;gap:10px;padding:11px 13px;border-radius:12px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd}`}
                  >
                    <span
                      style={`width:16px;height:16px;border-radius:999px;border:2px solid ${r().box};flex:0 0 auto;display:flex;align-items:center;justify-content:center`}
                    >
                      <span style={`width:7px;height:7px;border-radius:999px;background:${r().inner};display:block`} />
                    </span>
                    <span style={`font-size:13px;line-height:1.3;font-weight:${r().w}`}>{txt(SOURCE_LABEL_KEY[src])}</span>
                  </button>
                );
              }}
            </For>
          </div>

          <div style="margin-top:18px;display:flex;gap:8px">
            <button
              type="button"
              class="bn-tap"
              disabled={!ready() || state.closeDeal.busy}
              onClick={confirmCloseDeal}
              style={`flex:1;display:flex;align-items:center;justify-content:center;padding:13px;border-radius:12px;background:${ready() ? TEAL : '#eeedea'};color:${ready() ? '#fff' : FAINT};font-size:13.5px;font-weight:700`}
            >
              {t().confirmW}
            </button>
            <button
              type="button"
              class="bn-tap"
              disabled={state.closeDeal.busy}
              onClick={close}
              style="display:flex;align-items:center;padding:13px 16px;border-radius:12px;background:#f2f1ee;font-size:13.5px;font-weight:700"
            >
              {t().cancelW}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
