import { describe, it, expect } from 'vitest';
import { fmtSec, fmtSize, voiceA11yLabel } from './format';
import { tr, trN } from '../../i18n';

const ru = (key, vars) => tr('RU', key, vars);
const ruN = (key, n, vars) => trN('RU', key, n, vars);

describe('fmtSec', () => {
  it('formats seconds under a minute', () => {
    expect(fmtSec(0)).toBe('0:00');
    expect(fmtSec(9)).toBe('0:09');
  });

  it('formats minutes and seconds', () => {
    expect(fmtSec(65)).toBe('1:05');
    expect(fmtSec(600)).toBe('10:00');
  });
});

describe('fmtSize', () => {
  it('formats bytes', () => {
    expect(fmtSize(0)).toBe('0 B');
    expect(fmtSize(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(fmtSize(1024)).toBe('1 KB');
    expect(fmtSize(2048)).toBe('2 KB');
  });

  it('formats megabytes', () => {
    expect(fmtSize(1024 * 1024)).toBe('1.0 MB');
    expect(fmtSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
});

describe('voiceA11yLabel', () => {
  it('describes a playable message with its duration and timestamp', () => {
    expect(voiceA11yLabel({ playing: false, seconds: 13, date: '16.09.2026', time: '17:58' }, ru, ruN)).toBe(
      'Воспроизвести голосовое сообщение, 13 секунд, 16.09.2026 в 17:58'
    );
  });

  it('drops the timestamp when it is unknown', () => {
    expect(voiceA11yLabel({ playing: false, seconds: 1 }, ru, ruN)).toBe('Воспроизвести голосовое сообщение, 1 секунда');
  });

  it('describes a playing message without a timestamp', () => {
    expect(voiceA11yLabel({ playing: true, seconds: 2, date: '16.09.2026', time: '17:58' }, ru, ruN)).toBe(
      'Приостановить голосовое сообщение, 2 секунды'
    );
  });
});
