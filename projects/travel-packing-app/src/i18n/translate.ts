// Pure i18n logic: key resolution, interpolation, language detection, and
// RTL classification. No React or DOM dependency, so it's fully unit
// testable; src/i18n/context.tsx is the thin React wiring on top of it.

export type TranslationDict = { [key: string]: string | TranslationDict };

export interface LanguageInfo {
  code: string;
  englishName: string;
  nativeName: string;
  rtl: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', rtl: false },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', englishName: 'French', nativeName: 'Français', rtl: false },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'it', englishName: 'Italian', nativeName: 'Italiano', rtl: false },
  { code: 'ja', englishName: 'Japanese', nativeName: '日本語', rtl: false },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어', rtl: false },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'zh', englishName: 'Chinese', nativeName: '中文', rtl: false },
];

const RTL_CODES = new Set(SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code));

/** Dot-path lookup into a translation dictionary; undefined if missing or not a string. */
export function resolveTranslation(dict: TranslationDict, key: string): string | undefined {
  const parts = key.split('.');
  let node: string | TranslationDict | undefined = dict;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Replace {paramName} placeholders; a placeholder with no matching param is left as-is. */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  );
}

/**
 * Resolve and interpolate a key: active language wins, falling back to the
 * English dictionary, falling back to the key itself so a missing
 * translation is visibly wrong rather than a silent blank.
 */
export function translate(
  activeDict: TranslationDict,
  fallbackDict: TranslationDict,
  key: string,
  params?: Record<string, string | number>
): string {
  const template = resolveTranslation(activeDict, key) ?? resolveTranslation(fallbackDict, key) ?? key;
  return interpolate(template, params);
}

/** Pick the best-supported language from an ordered list of browser language tags. */
export function detectInitialLanguage(browserLanguages: string[], supportedCodes: string[]): string {
  for (const tag of browserLanguages) {
    const base = tag.split('-')[0].toLowerCase();
    if (supportedCodes.includes(base)) return base;
  }
  return 'en';
}

export function isRtlLanguage(code: string): boolean {
  return RTL_CODES.has(code);
}
