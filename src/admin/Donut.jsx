import { For } from 'solid-js';
import { BORDER, BORDER_SOFT, TEXT_FAINT, TEXT_GHOST, TEXT, INK, ACCENT_ROW, MONO } from './theme';
import { plural, UNIT } from './plural';

export default function Donut(props) {
  const total = () => props.items.reduce((a, b) => a + b.value, 0) || 1;
  const unit = () => props.unit || UNIT.listing;

  const segs = () => {
    let acc = 0;
    return props.items.map((it, i) => {
      const pct = (it.value / total()) * 100;
      const offset = -acc;
      acc += pct;
      const isSel = props.selected() === it.key;
      const dim = !!props.selected() && !isSel;
      return { ...it, pct, offset, color: it.color, isSel, dim };
    });
  };
  const selItem = () => segs().find((s) => s.isSel);
  const toggle = (key) => props.onToggle(props.selected() === key ? null : key);

  return (
    <article style={`border:1px solid ${BORDER};border-radius:4px;background:#fff;padding:18px 18px 16px;display:flex;flex-direction:column;gap:16px;min-width:0`}>
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <h2 style="margin:0;font-size:14px;font-weight:600;letter-spacing:-.01em">{props.title}</h2>
        <div style={`font-family:${MONO};font-size:10.5px;color:${TEXT_FAINT};white-space:nowrap;padding-top:2px`}>
          {total()} {plural(total(), unit())}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:132px minmax(0,1fr);gap:18px;align-items:center">
        <div style="position:relative;width:132px;height:132px">
          <svg viewBox="0 0 42 42" style="width:132px;height:132px;transform:rotate(-90deg)">
            <circle cx="21" cy="21" r="15.9155" fill="none" stroke={BORDER_SOFT} stroke-width="5.6" />
            <For each={segs()}>
              {(s) => (
                <circle
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={s.color}
                  stroke-width={s.isSel ? 7.8 : 5.6}
                  stroke-dasharray={`${s.pct.toFixed(2)} ${(100 - s.pct).toFixed(2)}`}
                  stroke-dashoffset={s.offset.toFixed(2)}
                  onClick={() => toggle(s.key)}
                  style={`cursor:pointer;transition:stroke-width 140ms ease,opacity 140ms ease;opacity:${s.dim ? 0.32 : 1}`}
                />
              )}
            </For>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none;padding:0 18px">
            <div style={`font-family:${MONO};font-size:24px;font-weight:500;line-height:1`}>{selItem() ? selItem().value : total()}</div>
            <div style={`font-size:10px;color:${TEXT_FAINT};text-align:center;line-height:1.2;max-width:100%;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden`}>
              {selItem() ? plural(selItem().value, unit()) : 'всего'}
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;min-width:0">
          <For each={segs()}>
            {(s) => (
              <button
                type="button"
                onClick={() => toggle(s.key)}
                style={`border:0;border-top:1px solid ${BORDER_SOFT};background:${s.isSel ? ACCENT_ROW : 'transparent'};cursor:pointer;text-align:left;padding:7px 8px;display:grid;grid-template-columns:8px minmax(0,1fr) auto auto;align-items:center;gap:9px`}
              >
                <span style={`width:8px;height:8px;border-radius:2px;background:${s.color}`} />
                <span style={`font-size:12.5px;color:${s.dim ? TEXT_GHOST : INK};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:${s.isSel ? 600 : 400}`}>
                  {s.label}
                </span>
                <span style={`font-family:${MONO};font-size:12px;color:${TEXT}`}>{s.value}</span>
                <span style={`font-family:${MONO};font-size:10.5px;color:${TEXT_GHOST};width:34px;text-align:right`}>{Math.round(s.pct)}%</span>
              </button>
            )}
          </For>
        </div>
      </div>

      <div style={`border-top:1px solid ${BORDER};padding-top:11px;font-size:12px;line-height:1.45;color:${TEXT};text-wrap:pretty;min-height:34px`}>
        {selItem()
          ? `${selItem().label} — ${selItem().value} ${plural(selItem().value, unit())} · ${Math.round((selItem().value / total()) * 100)}% от всех`
          : `${props.items.length} ${plural(props.items.length, UNIT.category)} · ${total()} ${plural(total(), unit())}`}
      </div>
    </article>
  );
}
