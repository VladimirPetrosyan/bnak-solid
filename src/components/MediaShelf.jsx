import { For, Show, createSignal } from 'solid-js';
import { t, txt, TEAL, TEAL_T, TEAL_TX } from '../store';
import Icon from './Icon';
import VideoMessage from '../screens/chat/VideoMessage';

const MAX_PHOTOS = 20;
const MAX_VIDEOS = 3;

export default function MediaShelf(props) {
  const [preview, setPreview] = createSignal(null);
  let fileInput;

  const photos = () => props.files.filter((f) => f.kind === 'image');
  const videos = () => props.files.filter((f) => f.kind === 'video');

  const addFiles = (list) => {
    const picked = Array.from(list || []);
    if (!picked.length) return;
    const next = [...props.files];
    let photoCount = photos().length;
    let videoCount = videos().length;
    for (const file of picked) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const kind = isImage && photoCount < MAX_PHOTOS ? 'image' : isVideo && videoCount < MAX_VIDEOS ? 'video' : null;
      if (!kind) continue;
      if (kind === 'image') photoCount++;
      else videoCount++;
      next.push({ id: Math.random().toString(36).slice(2), file, kind, url: URL.createObjectURL(file) });
    }
    props.onFiles(next);
  };

  const remove = (id) => props.onFiles(props.files.filter((f) => f.id !== id));

  return (
    <div>
      <div style="display:flex;flex-wrap:wrap;gap:12px">
        <button
          type="button"
          class="bn-tap"
          onClick={() => fileInput.click()}
          style={`width:120px;height:96px;border-radius:14px;border:1.5px dashed ${TEAL};background:${TEAL_T};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;flex:0 0 auto`}
        >
          <Icon name="plus" size={18} stroke={TEAL} weight={2.2} />
          <span style={`font-size:12px;font-weight:700;color:${TEAL_TX};text-align:center;padding:0 6px`}>{t().addMediaBtn}</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          multiple
          style="display:none"
          onChange={(e) => {
            addFiles(e.currentTarget.files);
            e.currentTarget.value = '';
          }}
        />

        <For each={props.files}>
          {(m) => (
            <div style="position:relative;width:120px;height:96px;border-radius:14px;overflow:hidden;background:#f2f1ee;flex:0 0 auto">
              <Show
                when={m.kind === 'image'}
                fallback={
                  <button type="button" onClick={() => setPreview(m)} style="position:absolute;inset:0;width:100%;height:100%;background:#000">
                    <video src={m.url} muted style="width:100%;height:100%;object-fit:cover;display:block;opacity:.75" />
                    <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
                      <span style="width:32px;height:32px;border-radius:999px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center">
                        <Icon name="play" size={14} stroke="#0e7c73" />
                      </span>
                    </span>
                  </button>
                }
              >
                <img src={m.url} alt="" style="width:100%;height:100%;object-fit:cover;display:block" />
              </Show>
              <button
                type="button"
                class="bn-tap"
                onClick={() => remove(m.id)}
                aria-label={t().deleteW}
                style="position:absolute;top:5px;right:5px;width:24px;height:24px;border-radius:999px;background:rgba(28,27,25,.62);display:flex;align-items:center;justify-content:center"
              >
                <Icon name="close" size={12} stroke="#fff" weight={2.6} />
              </button>
            </div>
          )}
        </For>
      </div>
      <div style="font-size:12px;color:#9a9793;margin-top:12px">{txt('mediaShelfNote', { n: photos().length })}</div>

      <Show when={preview()}>
        <div
          onClick={() => setPreview(null)}
          style="position:fixed;inset:0;z-index:300;background:rgba(20,19,17,.86);display:flex;align-items:center;justify-content:center;padding:24px"
        >
          <div onClick={(e) => e.stopPropagation()}>
            <VideoMessage url={preview().url} />
          </div>
        </div>
      </Show>
    </div>
  );
}
