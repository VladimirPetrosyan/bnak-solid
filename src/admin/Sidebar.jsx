import { For } from 'solid-js';
import { ACCENT, ACCENT_SOFT, BORDER, DANGER, DANGER_SOFT, TEXT, TEXT_FAINT, TEXT_LABEL, MONO } from './theme';

const NAV = [
  { id: 'overview', label: 'Обзор' },
  { id: 'listings', label: 'Объявления' },
  { id: 'complaints', label: 'Жалобы', alert: true },
  { id: 'users', label: 'Пользователи' },
  { id: 'agencies', label: 'Агентства' },
  { id: 'revisions', label: 'Правки', alert: true },
  { id: 'support', label: 'Поддержка', alert: true }
];

export default function Sidebar(props) {
  return (
    <aside style={`border-right:1px solid ${BORDER};background:#fff;display:flex;flex-direction:column;justify-content:space-between;padding:20px 0;position:sticky;top:0;height:100vh`}>
      <div style="display:flex;flex-direction:column;gap:24px">
        <div style="padding:0 20px;display:flex;flex-direction:column;gap:2px">
          <div style="font-size:15px;font-weight:700;letter-spacing:-.01em">HayHome</div>
          <div style={`font-size:11px;color:${TEXT_FAINT};font-family:${MONO};text-transform:uppercase;letter-spacing:.06em`}>Admin panel</div>
        </div>
        <nav style="display:flex;flex-direction:column;gap:2px;padding:0 10px">
          <For each={NAV}>
            {(n) => {
              const active = () => props.section() === n.id;
              const count = () => props.counts[n.id] || 0;
              const hot = () => n.alert && count() > 0;
              return (
                <button
                  type="button"
                  onClick={() => props.onSelect(n.id)}
                  style={`text-align:left;border:0;cursor:pointer;font-size:13.5px;font-weight:500;padding:9px 10px;border-radius:3px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;background:${active() ? ACCENT_SOFT : 'transparent'};color:${active() ? ACCENT : TEXT}`}
                >
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{n.label}</span>
                  <span
                    style={`font-family:${MONO};font-size:11px;padding:1px 5px;border-radius:2px;background:${hot() ? DANGER_SOFT : 'transparent'};color:${hot() ? DANGER : active() ? ACCENT : TEXT_LABEL}`}
                  >
                    {count()}
                  </span>
                </button>
              );
            }}
          </For>
        </nav>
      </div>
      <div style="padding:0 20px">
        <div style={`font-size:11px;color:${TEXT_LABEL};line-height:1.4`}>Только для администратора</div>
      </div>
    </aside>
  );
}
