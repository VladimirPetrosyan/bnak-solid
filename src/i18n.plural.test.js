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

  it('declines listing count on the map', () => {
    expect(trN('RU', 'mapLive', 1)).toBe('1 объявление на карте');
    expect(trN('RU', 'mapLive', 2)).toBe('2 объявления на карте');
    expect(trN('RU', 'mapLive', 5)).toBe('5 объявлений на карте');
    expect(trN('RU', 'mapLive', 11)).toBe('11 объявлений на карте');
    expect(trN('RU', 'mapLive', 21)).toBe('21 объявление на карте');
  });

  it('declines listing view counts', () => {
    expect(trN('RU', 'statViews', 1)).toBe('1 просмотр');
    expect(trN('RU', 'statViews', 2)).toBe('2 просмотра');
    expect(trN('RU', 'statViews', 5)).toBe('5 просмотров');
    expect(trN('RU', 'statViews', 11)).toBe('11 просмотров');
    expect(trN('RU', 'statViews', 21)).toBe('21 просмотр');
    expect(trN('EN', 'statViews', 1)).toBe('1 view');
    expect(trN('EN', 'statViews', 3)).toBe('3 views');
  });
});
