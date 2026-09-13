export const DISPLAY_KEY = 'moving-on-schedule.display';
export type DisplayPreferences = {
  showRemarks: boolean;
  showWeekend: boolean;
  // Missing in existing saved data and backups; defaults to hidden.
  showTeacher?: boolean;
};
export function parseDisplayPreferences(
  raw: string | null,
): DisplayPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    return {
      showRemarks: value?.showRemarks === true,
      showWeekend: value?.showWeekend !== false,
      ...(typeof value?.showTeacher === 'boolean'
        ? { showTeacher: value.showTeacher }
        : {}),
    };
  } catch {
    return { showRemarks: false, showWeekend: true };
  }
}
