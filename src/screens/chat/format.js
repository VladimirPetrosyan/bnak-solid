export const fmtSec = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
export const fmtSize = (n) => (n < 1024 ? n + ' B' : n < 1024 * 1024 ? Math.round(n / 1024) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB');
