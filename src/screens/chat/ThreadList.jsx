import { For, Show } from 'solid-js';
import { state, t, li, go, chatSellerOf, byId, roomsLabel, addrOf, unreadCountOf } from '../../store';
import { TEAL, TEAL_T, TEAL_TX, RED_T, RED_TX } from '../../theme';
import Icon from '../../components/Icon';
import ChatEmptyState from './ChatEmptyState';
import { lastPreviewBody } from './format';

const lastPreview = (last) => (last.id == null ? '' : (last.me ? t().youPrefix + ' ' : '') + lastPreviewBody(last, t()));

export default function ThreadList(props) {
  const empty = () => props.keys().length === 0;

  return (
    <div
      style={`flex:1 1 300px;display:flex;flex-direction:column;min-height:0;overflow-x:hidden;${
        state.isMob ? 'width:100%;min-width:0' : `min-width:260px;max-width:100%;${empty() ? '' : 'max-width:360px;border-right:1px solid #f0efec'}`
      }`}
    >
      <div style="padding:20px;display:flex;align-items:center;gap:12px;flex:0 0 auto">
        <Show when={state.isMob}>
          <button
            type="button"
            class="bn-tap"
            aria-label={t().backW}
            onClick={() => go('search')}
            style="width:34px;height:34px;flex:0 0 auto;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#f7f7f6;margin-left:-4px"
          >
            <Icon name="back" size={16} weight={2.2} />
          </button>
        </Show>
        <div style="font-size:18px;font-weight:800;letter-spacing:-.02em">{t().messages}</div>
      </div>
      <Show when={!empty()} fallback={<ChatEmptyState />}>
        <div style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden; padding:0px 16px">
          <For each={props.keys()}>
            {(key) => {
              const th = () => props.all()[key];
              const sl = () => chatSellerOf(th());
              const item = () => byId(th().listing);
              const last = () => th().msgs[th().msgs.length - 1] || {};
              const unread = () => unreadCountOf(state.unread[key]);
              return (
                <button
                  type="button"
                  class="bn-tap"
                  aria-current={key === props.currentKey() ? 'true' : undefined}
                  onClick={() => props.onSelect(key)}
                  style={`width:100%;min-width:0;text-align:left;display:block;padding:16px;border-radius:14px;background:${key === props.currentKey() ? '#f2f1ee' : 'transparent'}`}
                >
                  <div style="display:flex;align-items:center;gap:12px;min-width:0">
                    <span
                      style={`position:relative;width:34px;height:34px;border-radius:999px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto;background:${sl().score < 80 ? RED_T : TEAL_T};color:${sl().score < 80 ? RED_TX : TEAL_TX}`}
                    >
                      {sl().ini}
                    </span>
                    <span style="font-size:14px;font-weight:700;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {sl().n[li()]}
                    </span>
                    <span style="font-size:12px;color:#9a9793;flex:0 0 auto">{last().time || ''}</span>
                    <Show when={unread()}>
                      <span
                        style={`min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:${TEAL};color:#fff;font-size:10.5px;font-weight:800;display:flex;align-items:center;justify-content:center;flex:0 0 auto`}
                      >
                        {unread()}
                      </span>
                    </Show>
                  </div>
                  <Show when={item()}>
                    <div style="font-size:13px;color:#6f6d68;margin-top:8px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      {roomsLabel(item())} · {addrOf(item())}
                    </div>
                  </Show>
                  <div style="font-size:13px;color:#4a4844;margin-top:4px;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                    {lastPreview(last())}
                  </div>
                </button>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
