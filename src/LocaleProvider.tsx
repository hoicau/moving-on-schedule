import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createTranslator,
  detectLocale,
  formatDate,
  normalizeLocale,
  LOCALE_KEY,
  weekdays,
  type Locale,
} from './i18n';

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    const normalized = normalizeLocale(saved);
    if (normalized) return normalized;
  } catch {
    /* Language switching still works without persistent storage. */
  }
  return detectLocale(navigator.languages);
}
function useLocaleState() {
  const [locale, setLocale] = useState(initialLocale);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_KEY);
      const normalized = normalizeLocale(saved);
      if (normalized && normalized !== saved)
        localStorage.setItem(LOCALE_KEY, normalized);
    } catch {
      /* Keep the selected language even when persistence is unavailable. */
    }
  }, [locale]);
  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      days: weekdays(locale),
      narrowDays: weekdays(locale, 'narrow'),
      date: (date: Date, options: Intl.DateTimeFormatOptions) =>
        formatDate(locale, date, options),
      chooseLocale: (next: Locale) => {
        setLocale(next);
        try {
          localStorage.setItem(LOCALE_KEY, next);
          return true;
        } catch {
          return false;
        }
      },
    }),
    [locale],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `Moving-on Schedule · ${value.t('schedule.title')}`;
  }, [locale, value]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LOCALE_KEY || event.key === null)
        setLocale(initialLocale());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return value;
}
const LocaleContext = createContext<ReturnType<typeof useLocaleState> | null>(
  null,
);
export function LocaleProvider({ children }: { children: ReactNode }) {
  const value = useLocaleState();
  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
export function useI18n() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useI18n requires LocaleProvider');
  return value;
}
