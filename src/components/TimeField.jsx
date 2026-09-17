import { createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { TEAL, TEAL_TX } from '../theme';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const parse = (v) => {
  const [h, m] = (v || '00:00').split(':');
  return { h: h || '00', m: m || '00' };
};

export default function TimeField(props) {
  const [open, setOpen] = createSignal(false);
  let wrapRef;

  onMount(() => {
    const onDocClick = (e) => {
      if (wrapRef && !wrapRef.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    onCleanup(() => document.removeEventListener('click', onDocClick));
  });

  const pickHour = (h) => props.onChange(h + ':' + parse(props.value).m);
  const pickMinute = (m) => {
    props.onChange(parse(props.value).h + ':' + m);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style="position:relative">
      <button
        type="button"
        class="bn-tap"
        onClick={() => setOpen(!open())}
        aria-haspopup="dialog"
        aria-expanded={open()}
        style="display:flex;flex-direction:column;justify-content:center;gap:2px;width:100%;min-width:0;height:56px;padding:0 14px;border-radius:14px;background:#f7f7f6;border:1px solid transparent;text-align:left"
      >
        <span style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#9a9793">{props.label}</span>
        <span style="font-size:16px;font-weight:700;color:#1c1b19">{props.value || '00:00'}</span>
      </button>

      <Show when={open()}>
        <div style="position:absolute;top:calc(100% + 8px);left:0;z-index:60;width:180px;background:#fff;border-radius:16px;padding:8px;box-shadow:0 18px 44px -20px rgba(28,27,25,.5),0 0 0 1px #ebeae7;animation:bnUp .16s ease both;display:flex;gap:6px">
          <div style="flex:1;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
            <For each={HOURS}>
              {(h) => {
                const on = () => parse(props.value).h === h;
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => pickHour(h)}
                    style={`padding:8px;border-radius:10px;font-size:14px;font-weight:700;text-align:center;background:${on() ? TEAL : 'transparent'};color:${on() ? '#fff' : TEAL_TX}`}
                  >
                    {h}
                  </button>
                );
              }}
            </For>
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:2px">
            <For each={MINUTES}>
              {(m) => {
                const on = () => parse(props.value).m === m;
                return (
                  <button
                    type="button"
                    class="bn-tap"
                    onClick={() => pickMinute(m)}
                    style={`padding:8px;border-radius:10px;font-size:14px;font-weight:700;text-align:center;background:${on() ? TEAL : 'transparent'};color:${on() ? '#fff' : TEAL_TX}`}
                  >
                    {m}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
