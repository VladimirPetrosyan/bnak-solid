import { For, Show } from 'solid-js';
import { state, setState, t, txt } from '../../store';
import { overlay, modal } from '../../theme';
import Icon from '../Icon';

export default function HowModal() {
  const close = () => setState('howOpen', false);
  const steps = () => [
    ['1', t().how1t, t().how1x],
    ['2', t().how2t, t().how2x],
    ['3', t().how3t, t().how3x],
    ['4', t().how4t, t().how4x]
  ];

  return (
    <Show when={state.howOpen}>
      <div onClick={close} style={`${overlay};z-index:210;align-items:flex-start`}>
        <div onClick={(e) => e.stopPropagation()} style={`${modal('660px')};margin:2vh 0`}>
          <div style="display:flex;align-items:flex-start;gap:12px;padding:24px 24px 0">
            <div style="flex:1">
              <div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0e7c73">
                {t().howKicker}
              </div>
              <div style="font-size:clamp(21px,3.4vw,25px);font-weight:800;margin-top:8px;letter-spacing:-.03em">{t().howTitle}</div>
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
          <div style="padding:20px 24px 24px;display:flex;flex-direction:column;gap:12px">
            <For each={steps()}>
              {([n, title, text]) => (
                <div style="display:flex;gap:16px;padding:16px;border-radius:16px;background:#fbfbfa">
                  <div style="flex:0 0 34px;height:34px;border-radius:999px;background:#e8f4f2;color:#0a5f59;font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center">
                    {n}
                  </div>
                  <div style="flex:1">
                    <div style="font-size:16px;font-weight:800;letter-spacing:-.01em">{title}</div>
                    <div style="margin-top:4px;font-size:13.5px;line-height:1.6;color:#4a4844">{text}</div>
                  </div>
                </div>
              )}
            </For>
            <div style="padding:20px;border-radius:16px;background:#e8f4f2">
              <div style="font-size:15.5px;font-weight:800;color:#0a4f4a">{t().howPractice}</div>
              <div style="margin-top:8px;font-size:13.5px;line-height:1.6;color:#2f5f5a">{t().howPracticeX}</div>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
