import { Show, onCleanup, onMount } from 'solid-js';
import { state, t, cancelSignOutConfirm, confirmSignOut, RED } from '../../store';
import { overlay, modal } from '../../theme';
import Icon from '../Icon';

export default function ConfirmSignOutModal() {
  onMount(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') cancelSignOutConfirm();
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  return (
    <Show when={state.signOutConfirmOpen}>
      <div onClick={cancelSignOutConfirm} style={`${overlay};z-index:240;align-items:center`}>
        <div onClick={(e) => e.stopPropagation()} style={`${modal('340px')};padding:24px;text-align:center`}>
          <span style="width:48px;height:48px;border-radius:14px;background:#fceeeb;display:flex;align-items:center;justify-content:center;margin:0 auto">
            <Icon name="alert" size={22} stroke={RED} weight={2} />
          </span>
          <div style="margin-top:16px;font-size:18px;font-weight:800;letter-spacing:-.02em">{t().signOutConfirmQ}</div>
          <div style="margin-top:6px;font-size:13px;color:#6f6d68;line-height:1.5">{t().signOutConfirmSub}</div>
          <div style="margin-top:20px;display:flex;gap:8px">
            <button
              type="button"
              class="bn-tap"
              onClick={cancelSignOutConfirm}
              style="flex:1;display:flex;align-items:center;justify-content:center;padding:13px;border-radius:12px;background:#f2f1ee;font-size:14px;font-weight:700"
            >
              {t().cancelW}
            </button>
            <button
              type="button"
              class="bn-tap"
              onClick={confirmSignOut}
              style={`flex:1;display:flex;align-items:center;justify-content:center;padding:13px;border-radius:12px;background:${RED};color:#fff;font-size:14px;font-weight:700`}
            >
              {t().signOutW}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
