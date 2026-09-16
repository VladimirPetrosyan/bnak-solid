let ctx;

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function unlockNotifySound() {
  const c = ensureCtx();
  if (c.state === 'suspended') c.resume().catch(() => {});
}

export function playNotifySound() {
  try {
    const c = ensureCtx();
    if (c.state === 'suspended') c.resume().catch(() => {});
    const now = c.currentTime;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    gain.connect(c.destination);

    const o1 = c.createOscillator();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(880, now);
    o1.connect(gain);
    o1.start(now);
    o1.stop(now + 0.16);

    const o2 = c.createOscillator();
    o2.type = 'sine';
    o2.frequency.setValueAtTime(1320, now + 0.1);
    o2.connect(gain);
    o2.start(now + 0.1);
    o2.stop(now + 0.4);
  } catch {}
}
