import { For, Show, createEffect, createSignal } from 'solid-js';
import { t, txt, isoDay, dateLocale, fetchCalendar, setClosures, TEAL, TEAL_T, TEAL_TX, RED_T, RED_TX } from '../../store';
import { pillStyle } from '../../theme';
import Icon from '../../components/Icon';

const monthKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');

export default function RoomCalendar(props) {
  const [roomId, setRoomId] = createSignal(null);
  const [month, setMonth] = createSignal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [data, setData] = createSignal(null);
  const [selected, setSelected] = createSignal({});

  const room = () => props.rooms.find((r) => r.id === roomId()) || props.rooms[0];
  const today = isoDay();
  const picked = () => Object.keys(selected()).filter((d) => selected()[d]);

  const load = async () => {
    if (!room()) return;
    const out = await fetchCalendar(props.listingId, room().id, monthKey(month()));
    if (out) setData(out);
  };

  createEffect(() => {
    room();
    month();
    setSelected({});
    load();
  });

  const shift = (d) => setMonth(new Date(month().getFullYear(), month().getMonth() + d, 1));
  const lead = () => (month().getDay() + 6) % 7;
  const weekdays = () => {
    const fmt = new Intl.DateTimeFormat(dateLocale(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  };
  const monthTitle = () => {
    const s = new Intl.DateTimeFormat(dateLocale(), { month: 'long', year: 'numeric' }).format(month());
    return s[0].toUpperCase() + s.slice(1);
  };

  const apply = async (closed) => {
    const days = picked();
    if (!days.length) return;
    if (await setClosures(props.listingId, room().id, days, closed)) {
      setSelected({});
      load();
    }
  };

  return (
    <Show when={room()}>
      <div>
        <Show when={props.rooms.length > 1}>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
            <For each={props.rooms}>
              {(r) => (
                <button type="button" class="bn-tap" onClick={() => setRoomId(r.id)} style={pillStyle(room().id === r.id)}>
                  {r.name}
                </button>
              )}
            </For>
          </div>
        </Show>

        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
          <button type="button" class="bn-tap" aria-label={t().prevMonth} onClick={() => shift(-1)} disabled={monthKey(month()) <= today.slice(0, 7)} style="width:40px;height:40px;border-radius:12px;background:#f2f1ee;display:flex;align-items:center;justify-content:center">
            <Icon name="back" size={16} weight={2.2} />
          </button>
          <div style="font-size:16px;font-weight:800">{monthTitle()}</div>
          <button type="button" class="bn-tap" aria-label={t().nextMonth} onClick={() => shift(1)} style="width:40px;height:40px;border-radius:12px;background:#f2f1ee;display:flex;align-items:center;justify-content:center">
            <Icon name="next" size={16} weight={2.2} />
          </button>
        </div>

        <div style="margin-top:14px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">
          <For each={weekdays()}>
            {(w) => <div style="text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;color:#9a9793;padding-bottom:2px">{w}</div>}
          </For>
          <For each={Array.from({ length: lead() })}>{() => <div />}</For>
          <For each={data() ? data().days : []}>
            {(d) => {
              const past = d.day < today;
              const on = () => !!selected()[d.day];
              const bg = () => (on() ? TEAL : d.closed ? RED_T : d.available === 0 ? '#f2f1ee' : '#fff');
              const fg = () => (on() ? '#fff' : d.closed ? RED_TX : '#1c1b19');
              return (
                <button
                  type="button"
                  class="bn-tap"
                  disabled={past}
                  aria-pressed={on()}
                  onClick={() => setSelected({ ...selected(), [d.day]: !on() })}
                  style={`min-width:0;aspect-ratio:1/1;max-height:78px;padding:4px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:1px solid ${on() ? TEAL : '#eeedea'};background:${bg()};color:${fg()};opacity:${past ? 0.35 : 1};transition:background .12s,color .12s`}
                >
                  <span style="font-size:15px;font-weight:800;line-height:1">{+d.day.slice(8)}</span>
                  <span style={`font-size:10px;font-weight:700;line-height:1.1;white-space:nowrap;overflow:hidden;max-width:100%;color:${on() ? 'rgba(255,255,255,.85)' : d.closed ? RED_TX : TEAL_TX}`}>
                    {d.closed ? t().calClosed : txt('calFree', { a: d.available, b: data().room.quantity })}
                  </span>
                </button>
              );
            }}
          </For>
        </div>

        <div style="margin-top:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <Show when={picked().length} fallback={<div style="font-size:13px;color:#6f6d68">{t().calHint}</div>}>
            <button type="button" class="bn-tap" onClick={() => apply(true)} style={`padding:11px 16px;border-radius:12px;background:${RED_T};color:${RED_TX};font-size:14px;font-weight:700`}>
              {t().closeSelected} · {picked().length}
            </button>
            <button type="button" class="bn-tap" onClick={() => apply(false)} style={`padding:11px 16px;border-radius:12px;background:${TEAL_T};color:${TEAL_TX};font-size:14px;font-weight:700`}>
              {t().openSelected}
            </button>
            <button type="button" class="bn-tap" onClick={() => setSelected({})} style={`padding:11px 14px;border-radius:12px;font-size:14px;font-weight:600;color:${TEAL}`}>
              {t().clearSelection}
            </button>
          </Show>
        </div>
      </div>
    </Show>
  );
}
