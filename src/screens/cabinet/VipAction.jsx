import { Show } from 'solid-js';
import { TEAL_T, TEAL_TX, SOFT, MUTED } from '../../theme';

export default function VipAction(props) {
  const r = () => props.r;
  const disp = () => (props.compact ? 'inline-flex' : 'flex');
  const pad = () => (props.compact ? '12px 12px' : '12px 16px');
  const radius = () => (props.compact ? '11px' : '12px');
  const fontSize = () => (props.compact ? '12.5px' : '13px');

  return (
    <Show when={r().vipEligible}>
      <Show
        when={r().vipActive()}
        fallback={
          <button
            type="button"
            class="bn-tap"
            onClick={r().onVip}
            disabled={r().vipDisabled()}
            style={`display:${disp()};align-items:center;text-align:center;padding:${pad()};border-radius:${radius()};font-size:${fontSize()};font-weight:700;background:${TEAL_T};color:${TEAL_TX}`}
          >
            {r().vipLabel()}
          </button>
        }
      >
        <div
          style={`display:${disp()};align-items:center;gap:8px;flex-wrap:wrap;padding:${pad()};border-radius:${radius()};font-size:${fontSize()};font-weight:700;background:${SOFT};color:${MUTED}`}
        >
          <span>{r().vipLabel()}</span>
          <span style="font-variant-numeric:tabular-nums;opacity:.75">{r().vipTimeLabel()}</span>
        </div>
      </Show>
    </Show>
  );
}
