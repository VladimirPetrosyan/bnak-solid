import { Show, Switch, Match } from 'solid-js';
import { t } from '../../store';
import { TEAL, RED, RED_T, SOFT, FAINT, INK } from '../../theme';
import Icon from '../../components/Icon';
import { fmtSize } from './format';
import { viewUrl } from '../../listingLocation';

function AttachIcon(props) {
  return (
    <span
      style={`width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${props.bg};color:${props.fg}`}
    >
      <Icon name={props.name} size={18} weight={1.8} />
    </span>
  );
}

export default function MessageBubble(props) {
  const m = () => props.m;

  return (
    <div style={`display:flex;justify-content:${m().me ? 'flex-end' : 'flex-start'}`}>
      <div
        style={`max-width:78%;padding:12px;font-size:15px;line-height:1.5;box-shadow:0 1px 2px rgba(28,27,25,.05);border-radius:${m().me ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};background:${m().me ? TEAL : '#fff'};color:${m().me ? '#fff' : INK}`}
      >
        <Switch fallback={<div style="padding:0 4px;word-break:break-word">{m().text || ''}</div>}>
          <Match when={m().kind === 'audio'}>
            <audio controls src={m().url} style="width:224px;max-width:100%;display:block;height:36px" />
          </Match>
          <Match when={m().kind === 'video'}>
            <video controls src={m().url} style="max-width:240px;max-height:240px;border-radius:10px;display:block;background:#000" />
          </Match>
          <Match when={m().kind === 'image'}>
            <img
              src={m().url}
              alt={t().imgMsg}
              style="max-width:240px;max-height:280px;border-radius:10px;display:block;object-fit:cover"
            />
          </Match>
          <Match when={m().kind === 'file'}>
            <a
              href={m().url}
              target="_blank"
              rel="noreferrer"
              style="display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;padding:2px 4px"
            >
              <AttachIcon name="doc" bg={m().me ? 'rgba(255,255,255,.18)' : SOFT} fg={m().me ? '#fff' : '#4a4844'} />
              <div style="min-width:0">
                <div style="font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px">
                  {m().name}
                </div>
                <div style={`font-size:12px;margin-top:2px;color:${m().me ? 'rgba(255,255,255,.75)' : '#9a9793'}`}>
                  {fmtSize(m().size || 0)}
                </div>
              </div>
            </a>
          </Match>
          <Match when={m().kind === 'location'}>
            <a
              href={viewUrl({ lat: m().lat, lng: m().lng }, 16) || 'https://yandex.com/maps/'}
              target="_blank"
              rel="noopener noreferrer"
              style="display:flex;align-items:center;gap:11px;text-decoration:none;color:inherit;padding:2px 4px"
            >
              <AttachIcon name="pin" bg={m().me ? 'rgba(255,255,255,.18)' : RED_T} fg={m().me ? '#fff' : RED} />
              <div style="min-width:0">
                <div style="font-size:14px;font-weight:700">{t().locMsg}</div>
                <div style={`font-size:12px;margin-top:2px;text-decoration:underline;color:${m().me ? 'rgba(255,255,255,.85)' : TEAL}`}>
                  {t().locOpen}
                </div>
              </div>
            </a>
          </Match>
        </Switch>
        <Show when={m().time}>
          <div style={`font-size:11px;margin-top:4px;padding:0 4px;display:flex;align-items:center;gap:4px;justify-content:${m().me ? 'flex-end' : 'flex-start'}`}>
            <span style={`color:${m().me ? 'rgba(255,255,255,.7)' : FAINT}`}>{m().time}</span>
            <Show when={m().me}>
              <Icon
                name={m().pending ? 'check' : 'checks'}
                size={13}
                weight={2.2}
                stroke={m().readAt ? '#9fe8de' : 'rgba(255,255,255,.7)'}
              />
            </Show>
          </div>
        </Show>
      </div>
    </div>
  );
}
