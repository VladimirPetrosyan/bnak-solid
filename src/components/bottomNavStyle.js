export function bottomNavButtonStyle(active, on, off) {
  return `flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 4px;min-height:54px;border-radius:12px;text-align:center;color:${active ? on : off}`;
}

export const bottomNavIconWrapStyle = 'position:relative;display:inline-flex';

export const bottomNavLabelStyle = 'font-size:10.5px;font-weight:700;letter-spacing:-.01em;line-height:1.2;text-align:center';

export const bottomNavBadgeStyle =
  'position:absolute;top:0;left:100%;transform:translate(-50%,-50%);min-width:16px;height:16px;padding:0 4px;border-radius:999px;background:#0e7c73;color:#fff;font-size:9.5px;font-weight:800;display:flex;align-items:center;justify-content:center;line-height:1';
