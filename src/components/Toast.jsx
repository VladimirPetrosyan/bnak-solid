import { Show } from 'solid-js';
import { state } from '../store';

export default function Toast() {
  return (
    <Show when={state.toast}>
      <div
        style={`position:fixed;top:${state.screen === 'auth' ? '20px' : '84px'};right:20px;z-index:300;display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:14px;background:#1c1b19;color:#fff;font-size:13.5px;font-weight:600;box-shadow:0 18px 40px -18px rgba(28,27,25,.7);animation:bnDown .2s ease both;max-width:min(400px,calc(100vw - 40px))`}
      >
        <span style="width:8px;height:8px;border-radius:999px;background:#4ecdc0;display:block;flex:0 0 auto" />
        <span>{state.toast}</span>
      </div>
    </Show>
  );
}
