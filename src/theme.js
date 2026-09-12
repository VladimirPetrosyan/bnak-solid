export const TEAL = '#0e7c73';
export const TEAL_T = '#e8f4f2';
export const TEAL_TX = '#0a5f59';
export const INK = '#1c1b19';
export const MUTED = '#6f6d68';
export const FAINT = '#9a9793';
export const LINE = '#e8e7e4';
export const SOFT = '#f2f1ee';
export const RED = '#c2452f';
export const RED_T = '#fceeeb';
export const RED_TX = '#93331f';

export const SHADOW_CARD = '0 1px 2px rgba(28,27,25,.05)';
export const SHADOW_POP = '0 30px 70px -30px rgba(28,27,25,.6)';

export const pill = (on) => ({
  bg: on ? TEAL_T : '#fff',
  fg: on ? TEAL_TX : INK,
  bd: on ? TEAL : LINE
});

export const pillStyle = (on) => {
  const p = pill(on);
  return `padding:8px 16px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap;background:${p.bg};color:${p.fg};border:1px solid ${p.bd}`;
};

export const radio = (on) => ({
  bg: on ? TEAL_T : '#fff',
  bd: on ? TEAL : LINE,
  box: on ? TEAL : '#c9c7c2',
  inner: on ? TEAL : 'transparent',
  w: on ? 700 : 500
});

export const input = 'width:100%;padding:12px 16px;border-radius:13px;border:1px solid #e8e7e4;background:#fbfbfa;font-size:15px';

export const label = 'font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#9a9793';

export const overlay =
  'position:fixed;inset:0;z-index:200;background:rgba(28,27,25,.5);display:flex;justify-content:center;padding:clamp(12px,3vw,24px);animation:bnIn .16s ease;overflow-y:auto';

export const modal = (max) =>
  `width:100%;max-width:${max};background:#fff;border-radius:22px;animation:bnUp .22s ease both;box-shadow:${SHADOW_POP}`;
