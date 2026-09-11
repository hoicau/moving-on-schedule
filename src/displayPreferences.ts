export const DISPLAY_KEY = 'moving-on-schedule.display';
export type DisplayPreferences = { showRemarks: boolean; showWeekend: boolean };
export function parseDisplayPreferences(
  raw: string | null,
): DisplayPreferences {
  try {
    const value = JSON.parse(raw ?? '{}');
    return {
      showRemarks: value?.showRemarks === true,
      showWeekend: value?.showWeekend !== false,
    };
  } catch {
    return { showRemarks: false, showWeekend: true };
  }
}
