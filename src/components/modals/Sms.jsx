import { Show } from 'solid-js';
import { state, setState, t, txt, submitSms, TEAL, FAINT } from '../../store';
import { overlay, modal } from '../../theme';
import Icon from '../Icon';

export default function SmsModal() {
  const close = () => setState('sms', null);
  const ready = () => state.sms && (state.sms.code || '').length === 4;

  return (
    <Show when={state.sms}>
      <div onClick={close} style={`${overlay};z-index:220;align-items:center`}>
        <div onClick={(e) => e.stopPropagation()} style={`${modal('420px')};padding:24px`}>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="width:40px;height:40px;border-radius:12px;background:#e8f4f2;display:flex;align-items:center;justify-content:center;flex:0 0 auto">
              <Icon name="chat" size={19} stroke="#0e7c73" weight={2} />
            </span>
            <div style="flex:1;font-size:19px;font-weight:800;letter-spacing:-.02em">{t().smsTitle}</div>
          </div>
          <div style="margin-top:12px;font-size:13.5px;line-height:1.55;color:#4a4844">
            {txt('smsSub', { a: (state.user && state.user.phone) || '' })}
          </div>
          <input
            value={state.sms.code || ''}
            onInput={(e) => {
              const v = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
              e.currentTarget.value = v;
              setState('sms', 'code', v);
            }}
            onKeyDown={(e) => e.key === 'Enter' && submitSms()}
            placeholder="1111"
            style="margin-top:16px;width:100%;padding:16px;border-radius:14px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:22px;font-weight:800;letter-spacing:.5em;text-align:center"
          />
          <div style="margin-top:8px;font-size:12px;color:#9a9793;text-align:center">{t().codeHint}</div>
          <div style="margin-top:16px;display:flex;gap:10px">
            <div
              onClick={submitSms}
              style={`flex:1;display:flex;align-items:center;justify-content:center;padding:15px;border-radius:14px;background:${ready() ? TEAL : '#eeedea'};color:${ready() ? '#fff' : FAINT};font-size:14.5px;font-weight:700;cursor:pointer`}
            >
              {t().confirmW}
            </div>
            <div
              onClick={close}
              style="display:flex;align-items:center;padding:15px 18px;border-radius:14px;background:#f2f1ee;font-size:14.5px;font-weight:700;cursor:pointer"
            >
              {t().cancelW}
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
