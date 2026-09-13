import {
  DEFAULT_SETTINGS,
  SAMPLE_COURSES,
  decodeSaved,
  type SavedData,
} from './schedule';
import { isLocale, type Locale } from './i18n';
import type { DisplayPreferences } from './displayPreferences';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Preferences = {
  locale: Locale;
  theme: ThemePreference;
  display: DisplayPreferences;
};
export type UserData = { schedule: SavedData; preferences: Preferences };

export function defaultUserData(locale: Locale, isDemo = true): UserData {
  return structuredClone({
    schedule: {
      version: 1,
      courses: isDemo ? SAMPLE_COURSES : [],
      settings: DEFAULT_SETTINGS,
      isDemo,
    },
    preferences: {
      locale,
      theme: 'system',
      display: { showRemarks: false, showWeekend: true },
    },
  });
}

export function validatePreferences(preferences: Preferences): void {
  if (
    !isLocale(preferences.locale) ||
    !['light', 'dark', 'system'].includes(preferences.theme) ||
    typeof preferences.display.showRemarks !== 'boolean' ||
    typeof preferences.display.showWeekend !== 'boolean'
  )
    throw new Error('Invalid preferences.');
}

export function validateUserData(data: UserData): void {
  decodeSaved(JSON.stringify(data.schedule));
  validatePreferences(data.preferences);
  // Refuse unknown fields rather than silently discarding a newer format.
  const known = (value: object, fields: string[]) => {
    if (Object.keys(value).some((key) => !fields.includes(key)))
      throw new Error('Unsupported user-data fields.');
  };
  known(data, ['schedule', 'preferences']);
  known(data.schedule, ['version', 'courses', 'settings', 'isDemo']);
  known(data.preferences, ['locale', 'theme', 'display']);
  known(data.preferences.display, ['showRemarks', 'showWeekend']);
  known(data.schedule.settings, [
    'semester',
    'startDate',
    'totalWeeks',
    'periods',
  ]);
  for (const period of data.schedule.settings.periods)
    known(period, ['start', 'end']);
  for (const course of data.schedule.courses)
    known(course, [
      'id',
      'name',
      'teacher',
      'room',
      'day',
      'weeks',
      'color',
      'note',
      'timing',
      'start',
      'end',
    ]);
}
