import { Show } from 'solid-js';
import { state, t, requestRoleChange } from '../../store';
import { label as labelStyle, TEAL } from '../../theme';

export default function RoleUpgrade() {
  const role = () => (state.user || {}).role;
  const pending = () => {
    const rq = state.roleRequest.data;
    return rq && rq.status === 'pending' ? rq : null;
  };
  const rejected = () => {
    const rq = state.roleRequest.data;
    return rq && rq.status === 'rejected' ? rq : null;
  };
  const showAgency = () => role() !== 'agency';
  const showHotel = () => role() !== 'hotel';

  return (
    <Show when={showAgency() || showHotel()}>
      <div style="margin-top:16px;background:#fff;border-radius:18px;padding:24px;box-shadow:0 1px 2px rgba(28,27,25,.05)">
        <div style={labelStyle}>{t().roleUpgradeTitle}</div>
        <div style="margin-top:10px;font-size:14px;color:#6f6d68;line-height:1.5">{t().roleUpgradeText}</div>

        <Show when={pending()}>
          <div style={`margin-top:14px;padding:12px 16px;border-radius:12px;background:#e8f4f2;color:${TEAL};font-size:13px;font-weight:700`}>
            {pending().role === 'agency' ? t().roleRequestPendingAgency : t().roleRequestPendingHotel}
          </div>
        </Show>

        <Show when={!pending()}>
          <Show when={rejected()}>
            <div style="margin-top:14px;padding:12px 16px;border-radius:12px;background:#fceeeb;color:#93331f;font-size:13px;font-weight:600">
              {t().roleRequestRejected}
            </div>
          </Show>
          <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
            <Show when={showAgency()}>
              <button
                type="button"
                class="bn-tap"
                disabled={state.roleRequestBusy}
                onClick={() => requestRoleChange('agency')}
                style="padding:12px 16px;border-radius:12px;background:#f2f1ee;font-size:13px;font-weight:700"
              >
                {t().roleRequestAgency}
              </button>
            </Show>
            <Show when={showHotel()}>
              <button
                type="button"
                class="bn-tap"
                disabled={state.roleRequestBusy}
                onClick={() => requestRoleChange('hotel')}
                style="padding:12px 16px;border-radius:12px;background:#f2f1ee;font-size:13px;font-weight:700"
              >
                {t().roleRequestHotel}
              </button>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  );
}
