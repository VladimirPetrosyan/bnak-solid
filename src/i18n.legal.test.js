import { describe, it, expect } from 'vitest';
import { T, LI, tr, dict } from './i18n';
import { LEGAL_IDS, LEGAL_KEY_BY_ID } from './legalDocs';

describe('legal section i18n', () => {
  it('has all 8 legal items translated for HY, RU and EN', () => {
    LEGAL_IDS.forEach((id) => {
      const key = LEGAL_KEY_BY_ID[id];
      expect(T[key]).toBeDefined();
      Object.values(LI).forEach((i) => {
        expect(T[key][i]).toBeTruthy();
      });
    });
  });

  it('has navigation labels distinct from the item titles', () => {
    Object.values(LI).forEach((i) => {
      expect(T.legalBack[i]).toBeTruthy();
      expect(T.legalToList[i]).toBeTruthy();
      expect(T.legalUpdated[i]).toBeTruthy();
    });
    expect(T.legalBack).not.toEqual(T.legalPrivacy);
  });

  it('exposes the legal keys through dict() for every language', () => {
    ['ՀՅ', 'RU', 'EN'].forEach((lang) => {
      const d = dict(lang);
      LEGAL_IDS.map((id) => LEGAL_KEY_BY_ID[id])
        .concat(['legalTitle', 'legalBack', 'legalToList', 'legalBetaNote'])
        .forEach((key) => {
          expect(d[key]).toBeTruthy();
        });
    });
  });

  it('does not throw and returns a string for an unknown legal-like key', () => {
    expect(tr('EN', 'legalNotARealKey')).toBe('legalNotARealKey');
  });
});
