import { useEffect } from 'react';
import { useUserData } from './UserDataProvider';
import type { ThemePreference } from './userData';

export function useTheme() {
  const { data, store } = useUserData();
  const preference = data.preferences.theme;

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

  function chooseTheme(next: ThemePreference): void {
    void store.update((current) => ({
      ...current,
      preferences: { ...current.preferences, theme: next },
    }));
  }

  return { preference, chooseTheme };
}
