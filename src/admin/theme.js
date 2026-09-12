export const ACCENT = '#1F5C4A';
export const ACCENT_SOFT = '#F2F5F3';
export const ACCENT_BORDER = '#CFE0D8';
export const ACCENT_ROW = '#F7F9F8';

export const BG = '#FBFBFA';
export const SURFACE = '#FFFFFF';
export const SURFACE_ALT = '#FAFAF9';
export const FEED_BG = '#FCFCFB';
export const BORDER = '#E3E3E0';
export const BORDER_SOFT = '#F1F2F1';
export const DIVIDER = '#EEEEEB';

export const INK = '#16171A';
export const TEXT = '#4A4C50';
export const TEXT_MUTED = '#6E7075';
export const TEXT_FAINT = '#8A8C90';
export const TEXT_GHOST = '#A0A2A6';
export const TEXT_LABEL = '#B0B2B6';

export const DANGER = '#9A3412';
export const DANGER_SOFT = '#FDF0EB';
export const DANGER_BORDER = '#E5CFC9';
export const DANGER_HOVER = '#FDF4F1';

export const WARN = '#8A6410';
export const WARN_SOFT = '#FDF6E7';
export const WARN_BORDER = '#E8DCC0';
export const WARN_ACCENT = '#D9A62B';

export const NEUTRAL_SOFT = '#F3F3F2';
export const NEUTRAL_TEXT = '#6E7075';
export const NEUTRAL_ACCENT = '#C3C5C2';

export const ONLINE = '#1F9D5C';

export const OVERLAY = 'rgba(22,23,26,.42)';

export const SANS = "'Space Grotesk', Helvetica, sans-serif";
export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export const RAMP = [100, 76, 56, 39, 25, 15];

export function tint(weight) {
  if (weight >= 100) return ACCENT;
  return `color-mix(in oklab, ${ACCENT} ${weight}%, #EDEFEE)`;
}

export function rampColor(i) {
  return tint(RAMP[i % RAMP.length]);
}
