'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  translate,
  detectInitialLanguage,
  isRtlLanguage,
  SUPPORTED_LANGUAGES,
  TranslationDict,
} from './translate';
import enTranslations from './translations/en.json';

const STORAGE_KEY = 'packright_lang';
const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

// English is bundled statically (it's also the fallback dictionary), every
// other language is lazy-loaded on demand so a user who never switches
// language never downloads translations they won't use.
const TRANSLATION_LOADERS: Record<string, () => Promise<{ default: TranslationDict }>> = {
  en: () => Promise.resolve({ default: enTranslations as TranslationDict }),
  ar: () => import('./translations/ar.json'),
  de: () => import('./translations/de.json'),
  es: () => import('./translations/es.json'),
  fr: () => import('./translations/fr.json'),
  hi: () => import('./translations/hi.json'),
  it: () => import('./translations/it.json'),
  ja: () => import('./translations/ja.json'),
  ko: () => import('./translations/ko.json'),
  pt: () => import('./translations/pt.json'),
  zh: () => import('./translations/zh.json'),
};

interface I18nContextValue {
  language: string;
  setLanguage: (code: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRtl: boolean;
  languages: typeof SUPPORTED_LANGUAGES;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Detecting the initial language from localStorage/navigator.language is a
// synchronous read of external state available before first render, so it's
// resolved via a lazy useState initializer (matching this app's existing
// theme-detection pattern in page.tsx) rather than an effect -- an effect
// that calls setState synchronously on mount is exactly what
// react-hooks/set-state-in-effect flags, and there is no natural
// "subscribe and get called back" API for localStorage/navigator.language.
function detectStoredOrBrowserLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_CODES.includes(stored)) return stored;
  } catch {
    // Ignore storage access failures (private browsing, etc.)
  }
  const browserLanguages = navigator.languages ? Array.from(navigator.languages) : [navigator.language];
  return detectInitialLanguage(browserLanguages, SUPPORTED_CODES);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(detectStoredOrBrowserLanguage);
  const [dict, setDict] = useState<TranslationDict>(enTranslations as TranslationDict);

  useEffect(() => {
    let active = true;
    const loader = TRANSLATION_LOADERS[language] || TRANSLATION_LOADERS.en;
    loader().then((mod) => {
      if (active) setDict(mod.default);
    });
    document.documentElement.lang = language;
    document.documentElement.dir = isRtlLanguage(language) ? 'rtl' : 'ltr';
    return () => {
      active = false;
    };
  }, [language]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Best-effort persistence; the choice still applies for this session.
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(dict, enTranslations as TranslationDict, key, params),
    [dict]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t, isRtl: isRtlLanguage(language), languages: SUPPORTED_LANGUAGES }),
    [language, setLanguage, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within an I18nProvider');
  return ctx;
}
