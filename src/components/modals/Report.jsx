import { For, Show } from 'solid-js';
import { state, setState, t, txt, byId, roomsLabel, addrOf, submitReport, go, RED, FAINT } from '../../store';
import { radio, overlay, modal } from '../../theme';
import Icon from '../Icon';

export default function ReportModal() {
  const close = () => setState({ reportOn: null, reason: null, reportSent: false, reportText: '' });
  const target = () => {
    const l = byId(state.reportOn);
    return l ? `${roomsLabel(l)}, ${l.area} m² · ${addrOf(l)}` : '';
  };

  return (
    <Show when={state.reportOn}>
      <div onClick={close} style={`${overlay};z-index:210;align-items:center`}>
        <div onClick={(e) => e.stopPropagation()} style={`${modal('540px')};overflow:hidden`}>
          <div style="display:flex;align-items:flex-start;gap:12px;padding:24px 24px 0">
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#c2452f">
                {t().reportKicker}
              </div>
              <div style="font-size:20px;font-weight:800;margin-top:8px;letter-spacing:-.025em">{target()}</div>
            </div>
            <button
              type="button"
              class="bn-tap"
              onClick={close}
              aria-label={t().cancelW}
              style="width:34px;height:34px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#f7f7f6;flex:0 0 auto"
            >
              <Icon name="close" size={15} stroke="#4a4844" weight={2} />
            </button>
          </div>

          <Show when={!state.reportSent}>
            <div style="padding:20px 24px 24px">
              <div style="font-size:14px;color:#4a4844;line-height:1.5">{t().reportQ}</div>
              <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">
                <For each={['rs1', 'rs2', 'rs3', 'rs4']}>
                  {(key) => {
                    const r = () => radio(state.reason === key);
                    return (
                      <button
                        type="button"
                        class="bn-tap"
                        aria-pressed={state.reason === key}
                        onClick={() => setState('reason', key)}
                        style={`display:flex;gap:12px;align-items:flex-start;padding:16px;border-radius:14px;width:100%;text-align:left;background:${r().bg};border:1px solid ${r().bd}`}
                      >
                        <span
                          style={`width:19px;height:19px;border-radius:999px;border:2px solid ${r().box};flex:0 0 auto;margin-top:4px;display:flex;align-items:center;justify-content:center`}
                        >
                          <span style={`width:8px;height:8px;border-radius:999px;background:${r().inner};display:block`} />
                        </span>
                        <span style={`font-size:14px;line-height:1.45;font-weight:${r().w}`}>{txt(key)}</span>
                      </button>
                    );
                  }}
                </For>
              </div>
              <textarea
                value={state.reportText || ''}
                onInput={(e) => setState('reportText', e.currentTarget.value)}
                placeholder={t().reportPh}
                style="margin-top:16px;width:100%;min-height:80px;padding:12px 16px;border-radius:14px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:14px;resize:vertical"
              />
              <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
                <button
                  type="button"
                  class="bn-tap"
                  disabled={!state.reason}
                  onClick={submitReport}
                  style={`flex:1;display:flex;align-items:center;justify-content:center;padding:16px 20px;border-radius:14px;background:${state.reason ? RED : '#eeedea'};color:${state.reason ? '#fff' : FAINT};font-size:15px;font-weight:700`}
                >
                  {t().sendReport}
                </button>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={close}
                  style="display:flex;align-items:center;padding:16px 20px;border-radius:14px;background:#f2f1ee;font-size:15px;font-weight:700"
                >
                  {t().cancelW}
                </button>
              </div>
              <div style="margin-top:12px;font-size:12px;color:#6f6d68;line-height:1.5">{t().reportFine2}</div>
            </div>
          </Show>

          <Show when={state.reportSent}>
            <div style="padding:20px 24px 24px">
              <div style="display:flex;gap:16px;align-items:flex-start">
                <span style="width:40px;height:40px;border-radius:999px;background:#e8f4f2;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
                  <Icon name="check" size={19} stroke="#0e7c73" weight={2.8} />
                </span>
                <div>
                  <div style="font-size:20px;font-weight:800;letter-spacing:-.02em">{t().sentTitle}</div>
                  <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#4a4844">{t().sentText}</div>
                </div>
              </div>
              <div style="margin-top:20px;padding:16px;border-radius:14px;background:#f7f7f6;font-size:13px;line-height:1.55;color:#4a4844">
                {t().sentNote}
              </div>
              <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap">
                <button
                  type="button"
                  class="bn-tap"
                  onClick={close}
                  style="flex:1;display:flex;align-items:center;justify-content:center;padding:16px 20px;border-radius:14px;background:#0e7c73;color:#fff;font-size:15px;font-weight:700"
                >
                  {t().gotIt}
                </button>
                <button
                  type="button"
                  class="bn-tap"
                  onClick={() => {
                    close();
                    go('fav');
                  }}
                  style="display:flex;align-items:center;padding:16px 20px;border-radius:14px;background:#f2f1ee;font-size:15px;font-weight:700"
                >
                  {t().favs}
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
}
