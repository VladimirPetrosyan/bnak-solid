export function cabinetPillStyle(isMob) {
  if (isMob)
    return 'display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;border:1px solid #e8e7e4;cursor:pointer';
  return 'display:flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 12px 0 4px;border-radius:999px;border:1px solid #e8e7e4;cursor:pointer';
}
