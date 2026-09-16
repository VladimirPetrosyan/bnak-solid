import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { dateLocale } from '../store';
import { TEAL, TEAL_T, TEAL_TX } from '../theme';
import Icon from './Icon';

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fromISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const sameDay = (a, b) => a && b && toISO(a) === toISO(b);

export default function DateField(props) {
  const [open, setOpen] = createSignal(false);
  const [month, setMonth] = createSignal(fromISO(props.value));
  let wrapRef;

  onMount(() => {
    const onDocClick = (e) => {
      if (wrapRef && !wrapRef.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    onCleanup(() => document.removeEventListener('click', onDocClick));
  });

  const openPicker = () => {
    setMonth(fromISO(props.value));
    setOpen(!open());
  };

  const minDate = () => (props.min ? fromISO(props.min) : null);
  const isBeforeMin = (d) => {
    const min = minDate();
    return min && d < min;
  };

  const label = () => {
    const fmt = new Intl.DateTimeFormat(dateLocale(), { day: 'numeric', month: 'short' });
    return fmt.format(fromISO(props.value));
  };
  const monthTitle = () => {
    const s = new Intl.DateTimeFormat(dateLocale(), { month: 'long', year: 'numeric' }).format(month());
    return s[0].toUpperCase() + s.slice(1);
  };
  const weekdays = () => {
    const fmt = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  };
  const lead = () => (new Date(month().getFullYear(), month().getMonth(), 1).getDay() + 6) % 7;
  const days = () => {
    const y = month().getFullYear();
    const m = month().getMonth();
    const count = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: count }, (_, i) => new Date(y, m, i + 1));
  };
  const shiftMonth = (d) => setMonth(new Date(month().getFullYear(), month().getMonth() + d, 1));
  const canGoBack = () => {
    const min = minDate();
    if (!min) return true;
    return month().getFullYear() > min.getFullYear() || month().getMonth() > min.getMonth();
  };

  const pick = (d) => {
    if (isBeforeMin(d)) return;
    props.onChange(toISO(d));
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style="position:relative">
      <button
        type="button"
        class="bn-tap"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open()}
        style="display:flex;flex-direction:column;justify-content:center;gap:2px;width:100%;min-width:0;height:56px;padding:0 14px;border-radius:14px;background:#f7f7f6;border:1px solid transparent;text-align:left"
      >
        <span style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9a9793">{props.label}</span>
        <span style="font-size:16px;font-weight:700;color:#1c1b19">{label()}</span>
      </button>

      <Show when={open()}>
        <div style="position:absolute;top:calc(100% + 8px);left:0;z-index:60;width:288px;max-width:88vw;background:#fff;border-radius:16px;padding:14px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
            <button
              type="button"
              class="bn-tap"
              disabled={!canGoBack()}
              onClick={() => shiftMonth(-1)}
              style={`width:32px;height:32px;border-radius:10px;background:#f2f1ee;display:flex;align-items:center;justify-content:center;opacity:${canGoBack() ? 1 : 0.4}`}
            >
              <Icon name="back" size={14} weight={2.2} />
            </button>
            <div style="font-size:14px;font-weight:800">{monthTitle()}</div>
            <button type="button" class="bn-tap" onClick={() => shiftMonth(1)} style="width:32px;height:32px;border-radius:10px;background:#f2f1ee;display:flex;align-items:center;justify-content:center">
              <Icon name="next" size={14} weight={2.2} />
            </button>
          </div>

          <div style="margin-top:10px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px">
            <For each={weekdays()}>{(w) => <div style="text-align:center;font-size:10px;font-weight:700;text-transform:uppercase;color:#9a9793;padding-bottom:2px">{w}</div>}</For>
            <For each={Array.from({ length: lead() })}>{() => <div />}</For>
            <For each={days()}>
              {(d) => {
                const disabled = isBeforeMin(d);
                const on = () => sameDay(d, fromISO(props.value));
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    disabled={disabled}
                    onClick={() => pick(d)}
                    style={`aspect-ratio:1/1;border-radius:10px;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;background:${on() ? TEAL : disabled ? 'transparent' : TEAL_T};color:${on() ? '#fff' : disabled ? '#c9c7c2' : TEAL_TX};opacity:${disabled ? 0.5 : 1}`}
                  >
                    {d.getDate()}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
