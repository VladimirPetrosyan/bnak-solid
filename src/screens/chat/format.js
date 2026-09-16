export const fmtSec = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
export const fmtSize = (n) => (n < 1024 ? n + ' B' : n < 1024 * 1024 ? Math.round(n / 1024) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB');

export const lastPreviewBody = (last, t) =>
  last.kind === 'audio'
    ? '🎤 ' + t.audioMsg
    : last.kind === 'video'
      ? '📹 ' + t.attachVideo
      : last.kind === 'image'
        ? '📷 ' + t.imgMsg
        : last.kind === 'file'
          ? '📄 ' + (last.name || t.fileMsg)
          : last.kind === 'location'
            ? '📍 ' + t.locMsg
            : last.kind === 'booking'
              ? '🗓 ' + (last.text === 'request' ? t.bookingRequestT : t[{ confirmed: 'bkEvConfirmed', declined: 'bkEvDeclined', cancelled: 'bkEvCancelled' }[last.text]])
              : last.text || '';
