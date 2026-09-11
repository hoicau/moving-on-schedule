import { useEffect, useState } from 'react';

type ThemePreference = 'light' | 'dark' | 'system';
const THEME_KEY = 'moving-on-schedule.theme';

function parsePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const theme =
        preference === 'system'
          ? media.matches
            ? 'dark'
            : 'light'
          : preference;
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#111e2d' : '#b8dfff');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === THEME_KEY || event.key === null)
      ) {
        setPreference(parsePreference(event.newValue));
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function chooseTheme(next: ThemePreference): boolean {
    setPreference(next);
    try {
      localStorage.setItem(THEME_KEY, next);
      return true;
    } catch {
      return false;
    }
  }

  return { preference, chooseTheme };
}
