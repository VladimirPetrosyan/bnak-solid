import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { tooltipWidth, tooltipLeft, isOutside, shouldCloseOnKey, tooltipAriaProps } from './infoTooltipLayout';

let seq = 0;

export default function InfoTooltip(props) {
  const [open, setOpen] = createSignal(false);
  const [style, setStyle] = createSignal('');
  const id = 'info-tip-' + seq++;
  let btn;
  let pop;

  const place = () => {
    if (!btn) return;
    const vw = window.innerWidth;
    const rect = btn.getBoundingClientRect();
    const w = tooltipWidth(vw);
    const left = tooltipLeft(rect.left + rect.width / 2, w, vw);
    setStyle(`position:fixed;top:${rect.bottom + 8}px;left:${left}px;width:${w}px`);
  };

  const show = () => {
    setOpen(true);
    place();
  };
  const hide = () => setOpen(false);
  const toggle = () => (open() ? hide() : show());

  const onDocClick = (e) => {
    if (open() && isOutside(e.target, btn, pop)) hide();
  };
  const onKey = (e) => {
    if (open() && shouldCloseOnKey(e.key)) {
      hide();
      btn && btn.focus();
    }
  };

  onMount(() => {
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
  });
  onCleanup(() => {
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
  });

  const aria = () => tooltipAriaProps(open(), id);

  return (
    <span style="position:relative;display:inline-flex;vertical-align:middle;margin-left:6px">
      <button
        ref={btn}
        type="button"
        aria-label={props.label}
        aria-expanded={aria().expanded}
        aria-describedby={aria().describedby}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        style="width:18px;height:18px;border-radius:999px;border:1px solid #c9c7c2;background:#fff;color:#6f6d68;font-size:11px;font-weight:800;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto"
      >
        i
      </button>
      <Show when={open()}>
        <div
          ref={pop}
          id={id}
          role="tooltip"
          style={`${style()};z-index:250;background:#1c1b19;color:#fff;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.55;box-shadow:0 18px 40px -18px rgba(28,27,25,.7);animation:bnIn .14s ease`}
        >
          {props.children}
        </div>
      </Show>
    </span>
  );
}
