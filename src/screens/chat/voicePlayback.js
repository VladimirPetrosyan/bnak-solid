import { createSignal } from 'solid-js';

export const RATES = [1, 1.5, 2];
export const [globalRate, setGlobalRate] = createSignal(1);
export const [nowPlaying, setNowPlaying] = createSignal(null);

let activeAudio = null;
let registry = [];

export function registerVoice(audio) {
  registry.push(audio);
}

export function unregisterVoice(audio) {
  registry = registry.filter((a) => a !== audio);
  if (activeAudio === audio) activeAudio = null;
  if (nowPlaying() === audio) setNowPlaying(null);
}

export function playVoice(audio, onError) {
  if (activeAudio && activeAudio !== audio) activeAudio.pause();
  activeAudio = audio;
  setNowPlaying(audio);
  audio.muted = false;
  audio.volume = 1;
  audio.play()?.catch((e) => onError && onError(e));
}

export function playNextVoice(afterAudio) {
  const i = registry.indexOf(afterAudio);
  if (i === -1 || i === registry.length - 1) {
    if (nowPlaying() === afterAudio) setNowPlaying(null);
    return;
  }
  playVoice(registry[i + 1]);
}

export function cycleRate() {
  setGlobalRate(RATES[(RATES.indexOf(globalRate()) + 1) % RATES.length]);
}

export function closeNowPlaying() {
  const audio = nowPlaying();
  if (audio) audio.pause();
  setNowPlaying(null);
}
