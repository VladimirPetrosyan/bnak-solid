import { Show } from 'solid-js';
import { state, dismissMsgNotice, openMsgNotice } from '../store';
import Icon from './Icon';
import { TEAL_T, TEAL_TX } from '../theme';

export default function MessageNotice() {
  const n = () => state.msgNotice;

  return (
    <Show when={n()}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => openMsgNotice(n().key)}
        style="position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:310;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#fff;box-shadow:0 18px 40px -14px rgba(28,27,25,.35);max-width:min(380px,calc(100vw - 32px));cursor:pointer;animation:bnDown .2s ease both"
      >
        <span
          style={`width:38px;height:38px;border-radius:999px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:${TEAL_T};color:${TEAL_TX};font-weight:700;font-size:15px`}
        >
          {n().ini}
        </span>
        <div style="min-width:0;flex:1">
          <div style="font-size:13px;font-weight:700;color:#1c1b19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{n().name}</div>
          <div style="font-size:13px;color:#6f6d68;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{n().text}</div>
        </div>
        <button
          type="button"
          class="bn-tap"
          onClick={(e) => {
            e.stopPropagation();
            dismissMsgNotice();
          }}
          style="width:26px;height:26px;border-radius:999px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;color:#9a9793"
        >
          <Icon name="close" size={13} weight={2.2} />
        </button>
      </div>
    </Show>
  );
}
