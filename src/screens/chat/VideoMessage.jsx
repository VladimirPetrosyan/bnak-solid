import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { fmtSec } from './format';
import Icon from '../../components/Icon';

export default function VideoMessage(props) {
  let video;
  const [playing, setPlaying] = createSignal(false);
  const [cur, setCur] = createSignal(0);
  const [dur, setDur] = createSignal(0);
  const [muted, setMuted] = createSignal(true);
  const [fullscreen, setFullscreen] = createSignal(false);

  const toggle = () => {
    if (!video) return;
    if (playing()) video.pause();
    else video.play();
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const goFullscreen = (e) => {
    e.stopPropagation();
    if (!video) return;
    if (video.requestFullscreen) video.requestFullscreen();
    else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  };

  onMount(() => {
    const syncFs = () => setFullscreen(document.fullscreenElement === video || document.webkitFullscreenElement === video);
    const onBegin = () => setFullscreen(true);
    const onEnd = () => setFullscreen(false);
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    video.addEventListener('webkitbeginfullscreen', onBegin);
    video.addEventListener('webkitendfullscreen', onEnd);
    onCleanup(() => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
      video.removeEventListener('webkitbeginfullscreen', onBegin);
      video.removeEventListener('webkitendfullscreen', onEnd);
    });
  });

  onCleanup(() => video && video.pause());

  return (
    <div
      onClick={toggle}
      style="position:relative;width:220px;height:220px;max-width:100%;border-radius:14px;overflow:hidden;background:#e2e0da;cursor:pointer"
    >
      <video
        ref={video}
        src={props.url}
        muted={muted()}
        playsinline
        preload="metadata"
        onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCur(0);
        }}
        style={`display:block;width:100%;height:100%;object-fit:${fullscreen() ? 'contain' : 'cover'};background:${fullscreen() ? '#000' : 'transparent'}`}
      />

      <Show when={!playing()}>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.12)">
          <span style="width:46px;height:46px;border-radius:999px;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center">
            <Icon name="play" size={18} stroke="#0e7c73" style="margin-left:2px" />
          </span>
        </div>
      </Show>

      <button
        type="button"
        class="bn-tap"
        onClick={goFullscreen}
        aria-label="fullscreen"
        style="position:absolute;left:8px;top:8px;width:24px;height:24px;border-radius:999px;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"
      >
        <Icon name="maximize" size={12} stroke="#fff" />
      </button>

      <span style="position:absolute;left:8px;bottom:8px;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.5);color:#fff;font-size:11px;font-weight:600">
        {fmtSec(Math.round(playing() || cur() ? cur() : dur()))}
      </span>

      <button
        type="button"
        class="bn-tap"
        onClick={toggleMute}
        aria-label={muted() ? 'unmute' : 'mute'}
        style="position:absolute;right:8px;top:8px;width:24px;height:24px;border-radius:999px;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center"
      >
        <Icon name={muted() ? 'volumeOff' : 'volume'} size={13} stroke="#fff" />
      </button>

      <Show when={props.time}>
        <div style="position:absolute;right:8px;bottom:8px;display:flex;align-items:center;gap:4px;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.5)">
          <span style="font-size:11px;color:#fff">{props.time}</span>
          <Show when={props.me}>
            <Icon name={props.pending ? 'check' : 'checks'} size={12} weight={2.2} stroke={props.readAt ? '#fff' : 'rgba(255,255,255,.5)'} />
          </Show>
        </div>
      </Show>
    </div>
  );
}
