import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { t } from '../../store';
import Icon from '../../components/Icon';
import { nowPlaying, globalRate, cycleRate, closeNowPlaying } from './voicePlayback';

export default function VoiceMiniPlayer(props) {
  const [playing, setPlaying] = createSignal(false);
  const [cur, setCur] = createSignal(0);
  const [dur, setDur] = createSignal(0);

  createEffect(() => {
    const audio = nowPlaying();
    if (!audio) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCur(audio.currentTime);
    const onMeta = () => setDur(audio.duration || 0);
    setPlaying(!audio.paused);
    setCur(audio.currentTime);
    setDur(audio.duration || 0);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    onCleanup(() => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
    });
  });

  const pct = () => (dur() ? Math.min(1, cur() / dur()) : 0);

  const toggle = () => {
    const audio = nowPlaying();
    if (!audio) return;
    if (audio.paused) audio.play()?.catch(() => {});
    else audio.pause();
  };

  return (
    <Show when={nowPlaying()}>
      <div style="flex:0 0 auto;padding:10px 14px;background:#0e7c73;color:#fff;display:flex;align-items:center;gap:12px;position:relative;overflow:hidden">
        <button
          type="button"
          class="bn-tap"
          onClick={toggle}
          aria-label={playing() ? 'pause' : 'play'}
          style="width:32px;height:32px;border-radius:999px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.22)"
        >
          <Icon name={playing() ? 'pause' : 'play'} size={14} stroke="#fff" />
        </button>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{props.title}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:1px">{t().audioMsg}</div>
        </div>
        <button
          type="button"
          class="bn-tap"
          onClick={cycleRate}
          style="flex:0 0 auto;min-width:30px;height:22px;padding:0 7px;border-radius:999px;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.22);color:#fff"
        >
          {globalRate() + '×'}
        </button>
        <button
          type="button"
          class="bn-tap"
          onClick={closeNowPlaying}
          aria-label={t().closeW}
          style="width:28px;height:28px;border-radius:999px;flex:0 0 auto;display:flex;align-items:center;justify-content:center"
        >
          <Icon name="close" size={14} stroke="#fff" weight={2.2} />
        </button>
        <div style="position:absolute;left:0;right:0;bottom:0;height:2px;background:rgba(255,255,255,.25)">
          <div style={`height:100%;background:#fff;width:${pct() * 100}%`} />
        </div>
      </div>
    </Show>
  );
}
