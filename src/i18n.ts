import { messages } from './messages';

export const LOCALES = ['zh-CN', 'zh-TW', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_KEY = 'moving-on-schedule.locale';
export const LOCALE_NAMES: Record<Locale, string> = {
  'zh-CN': '简体中文',
  en: 'English',
  'zh-TW': '繁體中文',
};
export function isLocale(value: unknown): value is Locale {
  return LOCALES.some((locale) => locale === value);
}
export function detectLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const parts = language.toLowerCase().split('-');
    if (parts[0] === 'en') return 'en';
    if (parts[0] === 'zh') {
      if (parts.includes('hans')) return 'zh-CN';
      if (parts.some((p) => ['hant', 'tw', 'hk', 'mo'].includes(p)))
        return 'zh-TW';
      return 'zh-CN';
    }
  }
  return 'zh-CN';
}
export type Translator = (
  key: string,
  params?: Record<string, string | number>,
) => string;
export function createTranslator(locale: Locale): Translator {
  return (key, params = {}) => {
    const message =
      locale === 'zh-CN'
        ? key
        : (messages[key]?.[locale === 'en' ? 0 : 1] ?? key);
    // A callback keeps dollar signs and braces in user content literal.
    return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : placeholder,
    );
  };
}
export function formatDate(
  locale: Locale,
  date: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, options).format(date);
}
export function weekdays(locale: Locale, width: 'short' | 'narrow' = 'short') {
  return Array.from({ length: 7 }, (_, i) =>
    formatDate(locale, new Date(2024, 0, i + 1, 12), { weekday: width }),
  );
}
