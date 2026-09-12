import { createSignal } from 'solid-js';

export function useVoiceRecorder({ getUserMedia, MediaRecorder, setInterval, clearInterval, send, onError }) {
  const [recording, setRecording] = createSignal(false);
  const [seconds, setSeconds] = createSignal(0);

  let recorder = null;
  let chunks = [];
  let timer = null;
  let shouldSend = true;

  const start = async () => {
    if (!getUserMedia) {
      onError();
      return;
    }
    try {
      const stream = await getUserMedia({ audio: true });
      chunks = [];
      shouldSend = true;
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        if (shouldSend && chunks.length) {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          send(URL.createObjectURL(blob), seconds());
        }
        recorder = null;
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
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
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  return { recording, seconds, start, stop, cleanup };
}
