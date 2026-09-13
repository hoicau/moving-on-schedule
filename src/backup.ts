import { decodeSaved, type Course, type SavedData } from './schedule';
import { validatePreferences, type Preferences } from './userData';
import { checksum, type Integrity } from './integrity';
import type { UserData } from './userData';

export type BackupPreferences = Preferences;

export type BackupV1 = {
  format: 'moving-on-schedule';
  version: 1;
  exportedAt: string;
  schedule: {
    courses: (Course & { timing: 'period' | 'time' })[];
    settings: SavedData['settings'];
    isDemo: boolean;
  };
  preferences: BackupPreferences;
  integrity: Integrity;
};

/** Capture application state, including edits whose localStorage write failed. */
export async function createBackup(
  data: SavedData,
  preferences: BackupPreferences,
  now = new Date(),
): Promise<BackupV1> {
  decodeSaved(JSON.stringify(data));
  validatePreferences(preferences);

  // Select the public fields explicitly; transient state and storage keys do
  // not become part of the file format. Never localize stored user/demo text.
  const content = {
    format: 'moving-on-schedule' as const,
    version: 1 as const,
    exportedAt: now.toISOString(),
    schedule: {
      courses: data.courses.map((course) => ({
        id: course.id,
        name: course.name,
        teacher: course.teacher,
        room: course.room,
        day: course.day,
        weeks: [...course.weeks],
        color: course.color,
        note: course.note,
        ...(course.timing === 'time'
          ? { timing: 'time' as const, start: course.start, end: course.end }
          : {
              timing: 'period' as const,
              start: course.start,
              end: course.end,
            }),
      })),
      settings: {
        semester: data.settings.semester,
        startDate: data.settings.startDate,
        totalWeeks: data.settings.totalWeeks,
        periods: data.settings.periods.map(({ start, end }) => ({
          start,
          end,
        })),
      },
      isDemo: data.isDemo,
    },
    preferences: {
      locale: preferences.locale,
      theme: preferences.theme,
      display: {
        showRemarks: preferences.display.showRemarks,
        showWeekend: preferences.display.showWeekend,
      },
    },
  };
  return { ...content, integrity: await checksum(content) };
}

export async function downloadBackup(
  data: SavedData,
  preferences: BackupPreferences,
): Promise<void> {
  const backup = await createBackup(data, preferences);
  downloadJson(
    backup,
    `Moving-on-Schedule-backup-${backup.exportedAt.replace(/[:.]/g, '-')}.json`,
  );
}

export function backupUserData(backup: BackupV1): UserData {
  return structuredClone({
    schedule: { ...backup.schedule, version: 1 as const },
    preferences: backup.preferences,
  });
}

export function downloadJson(value: unknown, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + '\n'], {
      type: 'application/json;charset=utf-8',
    }),
  );
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
