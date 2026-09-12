import { describe, it, expect } from 'vitest';
import { LEGAL_IDS, LEGAL_KEY_BY_ID, resolveLegalId, legalDoc, legalList } from './legalDocs';
import { LANGS } from './i18n';

const BANNED_PHRASES = [
  'не несём никакой ответственности',
  'не несем никакой ответственности',
  'не несет никакой ответственности',
  'ни за что не отвечаем',
  'not liable for anything',
  'no liability whatsoever',
  'no responsibility whatsoever',
  'ոչ մի պատասխանատվություն'
];

const GENERIC_STUB_PATTERNS = [/\btodo\b/i, /\btbd\b/i, /lorem ipsum/i, /placeholder/i, /coming soon/i, /заполнить/i, /xxxx/i];

const NEUTRAL_PLACEHOLDER = {
  ՀՅ: 'կհրապարակվի հանրային մեկնարկից առաջ',
  RU: 'будет указано до публичного запуска',
  EN: 'to be published before public launch'
};

describe('LEGAL_IDS', () => {
  it('has exactly 8 unique document ids, each mapped to an i18n title key', () => {
    expect(LEGAL_IDS).toHaveLength(8);
    expect(new Set(LEGAL_IDS).size).toBe(8);
    LEGAL_IDS.forEach((id) => expect(LEGAL_KEY_BY_ID[id]).toMatch(/^legal[A-Z]/));
  });
});

describe('resolveLegalId', () => {
  it('accepts every known id', () => {
    LEGAL_IDS.forEach((id) => expect(resolveLegalId(id)).toBe(id));
  });

  it('rejects unknown, empty and malformed ids without throwing', () => {
    [undefined, null, '', 'not-a-real-doc', 123, {}, [], 'Privacy', ' privacy'].forEach((bad) => {
      expect(() => resolveLegalId(bad)).not.toThrow();
      expect(resolveLegalId(bad)).toBeNull();
    });
  });
});

describe('legalDoc', () => {
  it('returns null for an unknown id instead of throwing, for every language', () => {
    LANGS.forEach((lang) => {
      expect(legalDoc(lang, 'not-a-real-doc')).toBeNull();
      expect(legalDoc(lang, undefined)).toBeNull();
    });
  });

  it('has full structure and content for all 8 documents in all 3 languages', () => {
    LANGS.forEach((lang) => {
      LEGAL_IDS.forEach((id) => {
        const doc = legalDoc(lang, id);
        expect(doc).toBeTruthy();
        expect(doc.id).toBe(id);
        expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(doc.summary.length).toBeGreaterThan(10);
        expect(Array.isArray(doc.sections)).toBe(true);
        expect(doc.sections.length).toBeGreaterThanOrEqual(4);
        doc.sections.forEach((section) => {
          expect(section.heading.length).toBeGreaterThan(3);
          expect(Array.isArray(section.body)).toBe(true);
          expect(section.body.length).toBeGreaterThan(0);
          section.body.forEach((paragraph) => {
            expect(typeof paragraph).toBe('string');
            expect(paragraph.length).toBeGreaterThan(20);
          });
        });
      });
    });
  });

  it('keeps the same section count across languages for every document', () => {
    LEGAL_IDS.forEach((id) => {
      const counts = LANGS.map((lang) => legalDoc(lang, id).sections.length);
      expect(new Set(counts).size).toBe(1);
    });
  });

  it('never uses a blanket "we are not responsible for anything" disclaimer', () => {
    LANGS.forEach((lang) => {
      LEGAL_IDS.forEach((id) => {
        const doc = legalDoc(lang, id);
        const text = (doc.summary + ' ' + doc.sections.map((s) => s.heading + ' ' + s.body.join(' ')).join(' ')).toLowerCase();
        BANNED_PHRASES.forEach((phrase) => {
          expect(text).not.toContain(phrase.toLowerCase());
        });
      });
    });
  });

  it('never leaves a generic stub placeholder in document content', () => {
    LANGS.forEach((lang) => {
      LEGAL_IDS.forEach((id) => {
        const doc = legalDoc(lang, id);
        const text = doc.summary + ' ' + doc.sections.map((s) => s.heading + ' ' + s.body.join(' ')).join(' ');
        GENERIC_STUB_PATTERNS.forEach((re) => {
          expect(text).not.toMatch(re);
        });
      });
    });
  });

  it('uses the visible neutral placeholder for unknown operator details, not an invented name or address', () => {
    LANGS.forEach((lang) => {
      const contacts = legalDoc(lang, 'contacts');
      const personalData = legalDoc(lang, 'personalData');
      const text = [contacts, personalData].map((doc) => doc.sections.map((s) => s.body.join(' ')).join(' ')).join(' ');
      expect(text).toContain(NEUTRAL_PLACEHOLDER[lang]);
      expect(text).not.toMatch(/@(gmail|example|bnak)\.(com|am)/i);
      expect(text).not.toMatch(/\+374\s?\d/);
    });
  });
});

describe('operator contact info', () => {
  it('shows the configured operator name, email and city in contacts and personalData, with no leftover {vars}', () => {
    LANGS.forEach((lang) => {
      const contacts = legalDoc(lang, 'contacts');
      const personalData = legalDoc(lang, 'personalData');
      const text = [contacts, personalData].map((doc) => doc.sections.map((s) => s.body.join(' ')).join(' ')).join(' ');
      expect(text).toContain('HayHome');
      expect(text).toContain('support@hayhome.am');
      expect(text).toContain('Yerevan');
      expect(text).not.toMatch(/\{[a-z]+\}/);
    });
  });
});

describe('legalList', () => {
  it('lists all 8 documents in a stable order with a summary, for every language', () => {
    LANGS.forEach((lang) => {
      const list = legalList(lang);
      expect(list.map((item) => item.id)).toEqual(LEGAL_IDS);
      list.forEach((item) => {
        expect(item.summary.length).toBeGreaterThan(10);
        expect(item.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });
  });
});
