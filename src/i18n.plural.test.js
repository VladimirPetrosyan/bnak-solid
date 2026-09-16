import { describe, it, expect } from 'vitest';
import { trN } from './i18n';

describe('trN', () => {
  it('picks Russian plural forms', () => {
    expect(trN('RU', 'nightsN', 1)).toBe('1 ночь');
    expect(trN('RU', 'nightsN', 3)).toBe('3 ночи');
    expect(trN('RU', 'nightsN', 5)).toBe('5 ночей');
    expect(trN('RU', 'nightsN', 11)).toBe('11 ночей');
    expect(trN('RU', 'nightsN', 21)).toBe('21 ночь');
    expect(trN('RU', 'nightsN', 22)).toBe('22 ночи');
    expect(trN('RU', 'nightsN', 14)).toBe('14 ночей');
  });

  it('picks English singular and plural', () => {
    expect(trN('EN', 'nightsN', 1)).toBe('1 night');
    expect(trN('EN', 'nightsN', 2)).toBe('2 nights');
  });

  it('uses the single Armenian form', () => {
    expect(trN('ՀՅ', 'nightsN', 4)).toBe('4 գիշեր');
  });
});
