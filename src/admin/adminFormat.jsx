import { Show } from 'solid-js';
import { CITY, DIST, nf } from '../data';

export const addrLine = (l) => {
  if (!l) return '';
  const name = l.city !== 'yerevan' ? (CITY[l.city] ? CITY[l.city].n[1] : l.city) : (DIST[l.d] || DIST.center)[1];
  return name + ', ' + (l.street || '');
};

export const roomsLabel = (l) => {
  if (l.deal === 'comm') return 'помещение';
  if (l.rooms === 0) return 'Студия';
  return l.rooms + ' комн.';
};

export const priceOf = (l) => nf(l.price) + ' ֏';

export const dateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
};

export function PersonLine(props) {
  return (
    <div>
      <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9a9793">{props.label}</div>
      <Show when={props.person} fallback={<div style="margin-top:4px;font-size:13.5px;color:#9a9793">—</div>}>
        <div style="margin-top:4px;font-size:13.5px;font-weight:700">{props.person.name || 'Без имени'}</div>
        <div style="font-size:12px;color:#6f6d68;margin-top:2px;font-variant-numeric:tabular-nums">{props.person.phone || '—'}</div>
      </Show>
    </div>
  );
}
