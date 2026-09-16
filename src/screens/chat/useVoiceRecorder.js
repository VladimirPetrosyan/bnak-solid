import { createSignal } from 'solid-js';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
const WAVEFORM_BARS = 32;
const LIVE_BARS = 28;

function pickMimeType(MediaRecorder) {
  if (!MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

function downsample(raw, bars) {
  if (!raw.length) return [];
  const bucket = raw.length / bars;
  const out = [];
  for (let i = 0; i < bars; i++) {
    const start = Math.floor(i * bucket);
    const end = Math.max(start + 1, Math.floor((i + 1) * bucket));
    const slice = raw.slice(start, end);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  const max = Math.max(...out, 0.02);
  return out.map((v) => Math.min(1, v / max));
}

export function useVoiceRecorder({ getUserMedia, MediaRecorder, setInterval, clearInterval, send, onError }) {
  const [recording, setRecording] = createSignal(false);
  const [seconds, setSeconds] = createSignal(0);
  const [levels, setLevels] = createSignal([]);

  let recorder = null;
  let chunks = [];
  let timer = null;
  let levelTimer = null;
  let shouldSend = true;
  let audioCtx = null;
  let rawLevels = [];

  const sampleLevel = (analyser) => {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    rawLevels.push(rms);
    setLevels((l) => [...l, rms].slice(-LIVE_BARS));
  };

  const start = async () => {
    if (!getUserMedia) {
      onError();
      return;
    }
    try {
      const stream = await getUserMedia({ audio: true });
      chunks = [];
      rawLevels = [];
      setLevels([]);
      shouldSend = true;
      const mimeType = pickMimeType(MediaRecorder);
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        clearInterval(levelTimer);
        if (audioCtx) {
          audioCtx.close();
          audioCtx = null;
        }
        if (shouldSend && chunks.length) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          send(URL.createObjectURL(blob), seconds(), downsample(rawLevels, WAVEFORM_BARS));
        }
        recorder = null;
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);

      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (AC) {
        try {
          audioCtx = new AC();
          if (audioCtx.state === 'suspended') await audioCtx.resume();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 512;
          audioCtx.createMediaStreamSource(stream).connect(analyser);
          levelTimer = setInterval(() => sampleLevel(analyser), 100);
        } catch {
          audioCtx = null;
        }
      }
    } catch {
      onError();
    }
  };

  const stop = (doSend) => {
    clearInterval(timer);
    setRecording(false);
    shouldSend = doSend;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const cleanup = () => {
    clearInterval(timer);
    clearInterval(levelTimer);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  return { recording, seconds, levels, start, stop, cleanup };
}
