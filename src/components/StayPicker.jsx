import { Show } from 'solid-js';
import { state, t, txtN, setStay, isoDay, stayNightsCount, TEAL_TX } from '../store';
import DateField from './DateField';
import Icon from './Icon';

const box = 'display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0;height:56px;padding:0 14px;border-radius:14px;background:#f7f7f6;border:1px solid transparent';
const caption = 'font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9a9793';

function Stepper(props) {
  return (
    <button
      type="button"
      class="bn-tap"
      aria-label={props.label}
      disabled={props.disabled}
      onClick={props.onClick}
      style="width:30px;height:30px;border-radius:999px;background:#fff;display:flex;align-items:center;justify-content:center;flex:0 0 auto;box-shadow:0 1px 2px rgba(28,27,25,.12)"
    >
      <Icon name={props.icon} size={14} weight={2.4} />
    </button>
  );
}

export default function StayPicker(props) {
  const s = () => state.stay;

  return (
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:10px">
      <DateField label={t().checkInLbl} value={s().checkIn} min={isoDay()} onChange={(v) => setStay({ checkIn: v })} />
      <DateField label={t().checkOutLbl} value={s().checkOut} min={isoDay(1, new Date(s().checkIn + 'T00:00'))} onChange={(v) => setStay({ checkOut: v })} />
      <Show when={props.guests !== false}>
        <div style={`${box};flex-direction:row;align-items:center;justify-content:space-between;gap:8px`}>
          <div style="min-width:0;overflow:hidden">
            <div style={caption}>{t().guestsLbl}</div>
            <div style="font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              {s().guests} <span style="font-weight:600;color:#6f6d68">{txtN('guestWord', s().guests)}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex:0 0 auto">
            <Stepper icon="minus" label="−" disabled={s().guests <= 1} onClick={() => setStay({ guests: s().guests - 1 })} />
            <Stepper icon="plus" label="+" disabled={s().guests >= 50} onClick={() => setStay({ guests: s().guests + 1 })} />
          </div>
        </div>
      </Show>
      <div style={`grid-column:1/-1;font-size:13px;font-weight:700;color:${TEAL_TX}`}>{txtN('nightsN', stayNightsCount())}</div>
    </div>
  );
}
