import { For, Show } from 'solid-js';
import { state, t, li, go, chatSellerOf, byId, roomsLabel, addrOf } from '../../store';
import { TEAL, TEAL_T, TEAL_TX, RED_T, RED_TX } from '../../theme';
import Icon from '../../components/Icon';
import ChatEmptyState from './ChatEmptyState';

const lastPreview = (last) =>
  last.kind === 'audio'
    ? '🎤 ' + t().audioMsg
    : last.kind === 'video'
      ? '📹 ' + t().attachVideo
      : last.kind === 'image'
        ? '📷 ' + t().imgMsg
        : last.kind === 'file'
          ? '📄 ' + (last.name || t().fileMsg)
          : last.kind === 'location'
            ? '📍 ' + t().locMsg
            : last.text || '';

export default function ThreadList(props) {
  const empty = () => props.keys().length === 0;

  return (
    <div
      style={`flex:1 1 300px;min-width:260px;display:flex;flex-direction:column;min-height:0;${empty() ? '' : 'max-width:360px;border-right:1px solid #f0efec'}`}
    >
      <div style="padding:20px;display:flex;align-items:center;gap:12px;flex:0 0 auto">
        <Show when={state.isMob}>
          <div
            onClick={() => go('search')}
            style="width:34px;height:34px;flex:0 0 auto;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#f7f7f6;cursor:pointer;margin-left:-4px"
          >
            <Icon name="back" size={16} weight={2.2} />
          </div>
        </Show>
        <div style="font-size:18px;font-weight:800;letter-spacing:-.02em">{t().messages}</div>
      </div>
      <Show when={!empty()} fallback={<ChatEmptyState />}>
        <div style="flex:1;min-height:0;overflow-y:auto">
          <For each={props.keys()}>
            {(key) => {
              const th = () => props.all()[key];
              const sl = () => chatSellerOf(th());
              const item = () => byId(th().listing);
              const last = () => th().msgs[th().msgs.length - 1] || {};
              return (
                <div
                  onClick={() => props.onSelect(key)}
                  style={`padding:16px 20px;margin:0 12px 8px;border-radius:14px;cursor:pointer;background:${key === props.currentKey() ? '#f2f1ee' : 'transparent'}`}
                >
                  <div style="display:flex;align-items:center;gap:12px">
                    <span
                      style={`position:relative;width:34px;height:34px;border-radius:999px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${sl().score < 80 ? RED_T : TEAL_T};color:${sl().score < 80 ? RED_TX : TEAL_TX}`}
                    >
                      {sl().ini}
                    </span>
                    <span style="font-size:14px;font-weight:700;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {sl().n[li()]}
                    </span>
                    <span
                      style={`width:8px;height:8px;border-radius:999px;display:block;flex:0 0 auto;background:${state.unread[key] ? TEAL : 'transparent'}`}
                    />
                    <span style="font-size:11.5px;color:#9a9793">{last().time || ''}</span>
                  </div>
                  <Show when={item()}>
                    <div style="font-size:12.5px;color:#6f6d68;margin-top:8px">
                      {roomsLabel(item())} · {addrOf(item())}
                    </div>
                  </Show>
                  <div style="font-size:13px;color:#4a4844;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    {lastPreview(last())}
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
