import { describe, it, expect } from 'vitest';
import { resolveTranslation, interpolate, translate, detectInitialLanguage, isRtlLanguage, SUPPORTED_LANGUAGES, TranslationDict } from '../src/i18n/translate';
import en from '../src/i18n/translations/en.json';
import ar from '../src/i18n/translations/ar.json';
import de from '../src/i18n/translations/de.json';
import es from '../src/i18n/translations/es.json';
import fr from '../src/i18n/translations/fr.json';
import hi from '../src/i18n/translations/hi.json';
import itLang from '../src/i18n/translations/it.json';
import ja from '../src/i18n/translations/ja.json';
import ko from '../src/i18n/translations/ko.json';
import pt from '../src/i18n/translations/pt.json';
import zh from '../src/i18n/translations/zh.json';

const ALL_TRANSLATIONS: Record<string, TranslationDict> = { en, ar, de, es, fr, hi, it: itLang, ja, ko, pt, zh };

// Flattens a nested translation dict to a sorted list of dot-path keys, so
// two languages' key sets can be compared regardless of nesting depth.
function flattenKeys(dict: TranslationDict, prefix = ''): string[] {
  return Object.entries(dict).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : flattenKeys(value, path);
  });
}

describe('resolveTranslation', () => {
  const dict = { trip: { destination: 'Destination', nested: { deep: 'Deep value' } } };

  it('Given a dotted key path, When resolved, Then the nested string is returned', () => {
    expect(resolveTranslation(dict, 'trip.destination')).toBe('Destination');
    expect(resolveTranslation(dict, 'trip.nested.deep')).toBe('Deep value');
  });

  it('Given a key path that does not exist, When resolved, Then undefined is returned rather than throwing', () => {
    expect(resolveTranslation(dict, 'trip.doesNotExist')).toBeUndefined();
    expect(resolveTranslation(dict, 'nothing.here')).toBeUndefined();
  });

  it('Given a key path that resolves to an object rather than a string, When resolved, Then undefined is returned', () => {
    expect(resolveTranslation(dict, 'trip')).toBeUndefined();
  });
});

describe('interpolate', () => {
  it('Given a template with placeholders, When interpolated, Then each placeholder is replaced with its value', () => {
    expect(interpolate('Loaded {count} garments from {file}', { count: 3, file: 'closet.txt' }))
      .toBe('Loaded 3 garments from closet.txt');
  });

  it('Given a template with no placeholders, When interpolated with params, Then the string is unchanged', () => {
    expect(interpolate('Plain text', { unused: 1 })).toBe('Plain text');
  });

  it('Given no params, When interpolated, Then the template is returned unchanged', () => {
    expect(interpolate('No params here')).toBe('No params here');
  });

  it('Given a placeholder with no matching param, When interpolated, Then it is left as-is rather than producing "undefined"', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });
});

describe('translate', () => {
  const en = { greeting: 'Hello {name}', onlyInEnglish: 'English only' };
  const es = { greeting: 'Hola {name}' };

  it('Given a key present in the active language, When translated, Then the active language string is used and interpolated', () => {
    expect(translate(es, en, 'greeting', { name: 'Ana' })).toBe('Hola Ana');
  });

  it('Given a key missing from the active language but present in the fallback, When translated, Then the fallback is used', () => {
    expect(translate(es, en, 'onlyInEnglish')).toBe('English only');
  });

  it('Given a key missing from both the active language and the fallback, When translated, Then the key itself is returned rather than a blank string', () => {
    // A visible key beats a silent blank when a translation is missing.
    expect(translate(es, en, 'totally.missing.key')).toBe('totally.missing.key');
  });
});

describe('detectInitialLanguage', () => {
  it('Given a browser language that is directly supported, When detected, Then that language is chosen', () => {
    expect(detectInitialLanguage(['es-MX', 'en'], ['en', 'es', 'fr'])).toBe('es');
  });

  it('Given only unsupported browser languages, When detected, Then it falls back to English', () => {
    expect(detectInitialLanguage(['xx-YY'], ['en', 'es', 'fr'])).toBe('en');
  });

  it('Given an empty list of browser languages, When detected, Then it falls back to English', () => {
    expect(detectInitialLanguage([], ['en', 'es', 'fr'])).toBe('en');
  });

  it('Given multiple browser languages where only the second is supported, When detected, Then the first supported one wins over falling back to English', () => {
    expect(detectInitialLanguage(['xx-YY', 'de-DE'], ['en', 'de', 'fr'])).toBe('de');
  });
});

describe('isRtlLanguage', () => {
  it('Given Arabic, When checked, Then it is right-to-left', () => {
    expect(isRtlLanguage('ar')).toBe(true);
  });

  it.each(['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'hi'])(
    'Given %s, When checked, Then it is left-to-right', (code) => {
      expect(isRtlLanguage(code)).toBe(false);
    });
});

describe('the shipped language catalog', () => {
  it('Given SUPPORTED_LANGUAGES, When inspected, Then it covers the 11 target languages exactly once each', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code).sort();
    expect(codes).toEqual(['ar', 'de', 'en', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'zh']);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('Given each language entry, When inspected, Then it carries a non-empty native display name', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.nativeName.length).toBeGreaterThan(0);
    }
  });

  it('Given every SUPPORTED_LANGUAGES code, When matched against the shipped translation files, Then a translation dictionary exists for it', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(ALL_TRANSLATIONS[lang.code]).toBeDefined();
    }
  });
});

describe('translation file parity', () => {
  const englishKeys = flattenKeys(en as TranslationDict).sort();

  it('Given the English translation file, When its keys are collected, Then there is at least one key per UI section this app translates', () => {
    // Guards against an empty or truncated en.json passing the parity
    // check below vacuously.
    expect(englishKeys.length).toBeGreaterThan(50);
  });

  it.each(Object.keys(ALL_TRANSLATIONS).filter((code) => code !== 'en'))(
    'Given the %s translation file, When its keys are compared to English, Then every key matches exactly -- no missing or extra keys',
    (code) => {
      const keys = flattenKeys(ALL_TRANSLATIONS[code] as TranslationDict).sort();
      expect(keys).toEqual(englishKeys);
    }
  );

  it.each(Object.keys(ALL_TRANSLATIONS))(
    'Given the %s translation file, When every value is inspected, Then none are empty strings',
    (code) => {
      const keys = flattenKeys(ALL_TRANSLATIONS[code] as TranslationDict);
      for (const key of keys) {
        expect(resolveTranslation(ALL_TRANSLATIONS[code] as TranslationDict, key)?.length).toBeGreaterThan(0);
      }
    }
  );

  it.each(Object.keys(ALL_TRANSLATIONS))(
    'Given the %s translation file, When a value contains a {placeholder}, Then the English source has the exact same placeholder set',
    (code) => {
      const placeholderRegex = /\{(\w+)\}/g;
      const keys = flattenKeys(en as TranslationDict);
      for (const key of keys) {
        const enValue = resolveTranslation(en as TranslationDict, key) as string;
        const localizedValue = resolveTranslation(ALL_TRANSLATIONS[code] as TranslationDict, key) as string;
        const enParams = [...enValue.matchAll(placeholderRegex)].map((m) => m[1]).sort();
        const localizedParams = [...localizedValue.matchAll(placeholderRegex)].map((m) => m[1]).sort();
        expect(localizedParams).toEqual(enParams);
      }
    }
  );
});
