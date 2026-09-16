import { useUserData } from './UserDataProvider';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { createTranslator, formatDate, weekdays, type Locale } from './i18n';

function useLocaleState() {
  const { data, store } = useUserData();
  const locale = data.preferences.locale;
  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      days: weekdays(locale),
      narrowDays: weekdays(locale, 'narrow'),
      date: (date: Date, options: Intl.DateTimeFormatOptions) =>
        formatDate(locale, date, options),
      chooseLocale: (next: Locale) => {
        void store.update((current) => ({
          ...current,
          preferences: { ...current.preferences, locale: next },
        }));
      },
    }),
    [locale, store],
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
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
