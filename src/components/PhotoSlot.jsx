import { createSignal, Show } from 'solid-js';
import Icon from './Icon';

const FALLBACK = '/assets/listings/fallback.svg';

const dropped = new Map();

export function droppedFile(id) {
  return dropped.get(id)?.file || null;
}

export default function PhotoSlot(props) {
  const [url, setUrl] = createSignal(dropped.get(props.id)?.url || null);
  const [over, setOver] = createSignal(false);
  let fileInput;

  const take = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const next = URL.createObjectURL(file);
    dropped.set(props.id, { url: next, file });
    setUrl(next);
  };

  if (props.src) {
    let broken = false;
    const onError = (e) => {
      if (broken) return;
      broken = true;
      e.currentTarget.src = FALLBACK;
    };
    return (
      <div style="position:absolute;inset:0;overflow:hidden;background:#f2f1ee">
        <img
          src={props.src}
          alt={props.label}
          loading="lazy"
          width="640"
          height="420"
          onError={onError}
          style={`width:100%;height:100%;object-fit:${props.fit || 'cover'}`}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={() => fileInput.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files[0]);
      }}
      style={`position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:${over() ? '#e8f4f2' : 'repeating-linear-gradient(135deg,#e6e5e1 0 9px,#eeedea 9px 18px)'}`}
    >
      <input ref={fileInput} type="file" accept="image/*" style="display:none" onChange={(e) => take(e.currentTarget.files[0])} />
      <Show
        when={url()}
        fallback={
          <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px;text-align:center;pointer-events:none">
            <Icon name="image" size={18} stroke="#bab6b1" />
            <span style="font-size:12px;font-weight:600;color:#8f8b85;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;max-width:22ch;line-height:1.35">
              {props.label}
            </span>
          </div>
        }
      >
        <img src={url()} alt={props.label} style={`width:100%;height:100%;object-fit:${props.fit || 'cover'}`} />
      </Show>
    </button>
  );
}

