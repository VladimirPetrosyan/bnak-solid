import { createSignal, createEffect, onMount, onCleanup, For, Show } from 'solid-js';
import { fmtSec, voiceA11yLabel } from './format';
import Icon from '../../components/Icon';
import { say, txt, txtN } from '../../store';
import { globalRate, playVoice, playNextVoice, registerVoice, unregisterVoice } from './voicePlayback';

const PLAY_ERROR_KEY = { NotAllowedError: 'voicePlayBlocked', NotSupportedError: 'voicePlayUnsupported' };
const WAVEFORM_BARS = 24;
const FALLBACK_BARS = Array.from({ length: WAVEFORM_BARS }, (_, i) => 0.35 + 0.3 * Math.abs(Math.sin(i * 1.4)) + 0.15 * Math.abs(Math.sin(i * 0.53)));

export default function VoiceMessage(props) {
  let audio, trackRef;
  const [playing, setPlaying] = createSignal(false);
  const [cur, setCur] = createSignal(0);
  const [dur, setDur] = createSignal(props.dur || 0);
  const [transcribing, setTranscribing] = createSignal(false);
  const [showText, setShowText] = createSignal(false);
  const me = () => props.me;
  const bars = () => (props.waveform && props.waveform.length ? props.waveform : FALLBACK_BARS);

  const pct = () => (dur() ? Math.min(1, cur() / dur()) : 0);

  const toggle = () => {
    if (!audio) return;
    if (playing()) {
      audio.pause();
      return;
    }
    playVoice(audio, (e) => say(txt(PLAY_ERROR_KEY[e?.name] || 'voicePlayFailed')));
  };

  const toggleTranscript = async () => {
    if (showText()) {
      setShowText(false);
      return;
    }
    if (props.transcript) {
      setShowText(true);
      return;
    }
    if (transcribing() || !props.onTranscribe) return;
    setTranscribing(true);
    try {
      await props.onTranscribe();
      setShowText(true);
    } catch {
    } finally {
      setTranscribing(false);
    }
  };

  const seek = (e) => {
    if (!audio || !dur() || !trackRef) return;
    const r = trackRef.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    audio.currentTime = Math.min(1, Math.max(0, x / r.width)) * dur();
  };

  onMount(() => registerVoice(audio));

  createEffect(() => {
    if (audio) audio.playbackRate = globalRate();
  });

  onCleanup(() => {
    unregisterVoice(audio);
    audio && audio.pause();
  });

  const fg = me() ? '#fff' : '#0e7c73';
  const track = me() ? 'rgba(255,255,255,.35)' : '#cfe8e4';
  const fill = me() ? '#fff' : '#0e7c73';

  return (
    <div style="width:222px;max-width:100%">
      <audio
        ref={audio}
        src={props.url}
        preload="metadata"
        onLoadedMetadata={(e) => isFinite(e.currentTarget.duration) && setDur(e.currentTarget.duration)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCur(0);
          playNextVoice(audio);
        }}
        style="display:none"
      />
      <div style="display:flex;align-items:center;gap:7px">
        <button
          type="button"
          class="bn-tap"
          onClick={toggle}
          aria-label={voiceA11yLabel({ playing: playing(), seconds: dur(), date: props.date, time: props.time }, txt, txtN)}
          style={`width:34px;height:34px;border-radius:999px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:${me() ? 'rgba(255,255,255,.22)' : '#e8f4f2'}`}
        >
          <Icon name={playing() ? 'pause' : 'play'} size={15} stroke={fg} />
        </button>

        <div
          ref={trackRef}
          onClick={seek}
          style="flex:1;min-width:0;overflow:hidden;display:flex;align-items:center;gap:2px;height:26px;cursor:pointer"
        >
          <For each={bars()}>
            {(v, i) => (
              <div
                style={`flex:1;min-width:1.5px;height:${4 + v * 18}px;border-radius:999px;background:${i() / bars().length < pct() ? fill : track};transition:background .15s linear`}
              />
            )}
          </For>
        </div>

        <span style={`font-size:11px;font-weight:600;flex:0 0 auto;color:${me() ? 'rgba(255,255,255,.8)' : '#9a9793'}`}>
          {fmtSec(Math.round(playing() || cur() ? cur() : dur()))}
        </span>

        <Show when={props.onTranscribe}>
          <button
            type="button"
            class="bn-tap"
            onClick={toggleTranscript}
            disabled={transcribing()}
            aria-pressed={showText()}
            aria-label={txt(transcribing() ? 'transcribing' : showText() ? 'hideTranscript' : 'showTranscript')}
            style={`flex:0 0 auto;width:27px;height:27px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:${showText() ? (me() ? 'rgba(255,255,255,.28)' : '#e8f4f2') : 'transparent'};color:${me() ? 'rgba(255,255,255,.8)' : '#0e7c73'};opacity:${transcribing() ? 0.5 : 1}`}
          >
            <Icon name="messageLanguage" size={18} stroke="currentColor" weight={2} />
          </button>
        </Show>
      </div>
      <Show when={showText() && props.transcript}>
        <div style={`font-size:13px;line-height:1.4;margin-top:6px;padding-left:41px;color:${me() ? '#fff' : '#1c1b19'}`}>{props.transcript}</div>
      </Show>
    </div>
  );
}
