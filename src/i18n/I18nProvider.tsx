// SPDX-License-Identifier: Apache-2.0
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { dictionaries, Language, Translations } from './translations';
import { getStoredLanguage, storeLanguage } from '@/storage/preferences';

type Leaf = string;

/** Dot-path into the translations tree, e.g. "home.usageData". */
type Path<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends object
    ? Path<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[keyof T & string];

export type TranslationKey = Path<Translations>;

type Vars = Record<string, string | number>;

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Vars) => Leaf;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolve(dict: Translations, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], dict);
  return typeof value === 'string' ? value : key;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function I18nProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: Language;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    void storeLanguage(lang);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => interpolate(resolve(dictionaries[language], key), vars),
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

export async function loadInitialLanguage(): Promise<Language> {
  return (await getStoredLanguage()) ?? 'nl';
}
