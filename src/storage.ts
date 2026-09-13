import { checksum, verifyIntegrity, type Integrity } from './integrity';
import { defaultUserData, validateUserData, type UserData } from './userData';
import { decodeSaved } from './schedule';
import { LOCALE_KEY, normalizeLocale, type Locale } from './i18n';
import { DISPLAY_KEY } from './displayPreferences';

export const STORAGE_KEY = 'moving-on-schedule.data';
export const LEGACY_KEYS = [
  'moving-on-schedule.v1',
  LOCALE_KEY,
  'moving-on-schedule.theme',
  DISPLAY_KEY,
] as const;
export const STORAGE_KEYS = [STORAGE_KEY, ...LEGACY_KEYS];
export type StorageSource = Pick<Storage, 'getItem' | 'setItem'>;
export type Snapshot = Record<string, string | null>;
export type StorageIssue =
  'unavailable' | 'corrupt' | 'conflict' | 'failed' | 'unsupported';
export class StorageFailure extends Error {
  constructor(public issue: StorageIssue) {
    super(issue);
  }
}
export type StoredDocument = {
  format: 'moving-on-schedule-storage';
  version: 1;
  revision: string;
  data: UserData;
  integrity: Integrity;
};
export type LoadedData = {
  data: UserData;
  baseline: Snapshot;
  issue?: StorageIssue;
  verified: boolean;
};

export function readSnapshot(storage: StorageSource): Snapshot {
  const raw = storage.getItem(STORAGE_KEY);
  // Once migrated, old keys are archival only and cannot overwrite new data.
  return raw !== null
    ? { [STORAGE_KEY]: raw }
    : Object.fromEntries(
        STORAGE_KEYS.map((key) => [
          key,
          key === STORAGE_KEY ? null : storage.getItem(key),
        ]),
      );
}

export function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function decodeDocument(raw: string): Promise<StoredDocument> {
  const parsed = JSON.parse(raw) as StoredDocument;
  if (
    !parsed ||
    parsed.format !== 'moving-on-schedule-storage' ||
    parsed.version !== 1 ||
    typeof parsed.revision !== 'string' ||
    !parsed.revision ||
    Object.keys(parsed).some(
      (key) =>
        !['format', 'version', 'revision', 'data', 'integrity'].includes(key),
    )
  )
    throw new StorageFailure('corrupt');
  const { integrity, ...content } = parsed;
  await verifyIntegrity(content, integrity);
  validateUserData(parsed.data);
  return parsed;
}

export async function loadUserData(
  storage: StorageSource,
  locale: Locale,
): Promise<LoadedData> {
  let baseline: Snapshot;
  try {
    baseline = readSnapshot(storage);
  } catch {
    return {
      data: defaultUserData(locale, false),
      baseline: {},
      issue: 'unavailable',
      verified: false,
    };
  }
  try {
    const raw = baseline[STORAGE_KEY];
    if (raw !== null) {
      if (!globalThis.crypto?.subtle) {
        return {
          data: defaultUserData(locale, false),
          baseline,
          issue: 'unsupported',
          verified: false,
        };
      }
      const document = await decodeDocument(raw);
      return { data: document.data, baseline, verified: true };
    }
    const data = defaultUserData(locale);
    const [scheduleKey, localeKey, themeKey, displayKey] = LEGACY_KEYS;
    if (baseline[scheduleKey] !== null)
      data.schedule = decodeSaved(baseline[scheduleKey]!);
    if (baseline[localeKey] !== null) {
      const saved = normalizeLocale(baseline[localeKey]);
      if (!saved) throw new Error('Invalid legacy locale.');
      data.preferences.locale = saved;
    }
    if (baseline[themeKey] !== null) {
      const saved = baseline[themeKey];
      if (saved !== 'light' && saved !== 'dark' && saved !== 'system')
        throw new Error('Invalid legacy theme.');
      data.preferences.theme = saved;
    }
    if (baseline[displayKey] !== null) {
      const saved = JSON.parse(baseline[displayKey]!);
      if (!saved || typeof saved !== 'object' || Array.isArray(saved))
        throw new Error('Invalid legacy display.');
      for (const key of ['showRemarks', 'showWeekend']) {
        if (key in saved && typeof saved[key] !== 'boolean')
          throw new Error('Invalid legacy display.');
      }
      data.preferences.display = {
        showRemarks: saved.showRemarks ?? false,
        showWeekend: saved.showWeekend ?? true,
      };
    }
    validateUserData(data);
    return { data, baseline, verified: false };
  } catch {
    return {
      data: defaultUserData(locale, false),
      baseline,
      issue: 'corrupt',
      verified: false,
    };
  }
}

export type WithLock = <T>(work: () => Promise<T>) => Promise<T>;
export const browserLock: WithLock = async (work) => {
  if (!navigator.locks || !crypto.subtle)
    throw new StorageFailure('unsupported');
  return navigator.locks.request(
    STORAGE_KEY,
    { signal: AbortSignal.timeout(5000) },
    work,
  );
};

/** Serialize writers and compare the exact snapshot the editor originally read. */
export async function saveUserData(
  storage: StorageSource,
  lock: WithLock,
  baseline: Snapshot,
  data: UserData,
): Promise<Snapshot> {
  validateUserData(data);
  return lock(async () => {
    if (!sameSnapshot(readSnapshot(storage), baseline))
      throw new StorageFailure('conflict');
    const content = {
      format: 'moving-on-schedule-storage' as const,
      version: 1 as const,
      revision: crypto.randomUUID(),
      data,
    };
    const document: StoredDocument = {
      ...content,
      integrity: await checksum(content),
    };
    const raw = JSON.stringify(document);
    // Also catches writers that do not participate in Web Locks during hashing.
    if (!sameSnapshot(readSnapshot(storage), baseline))
      throw new StorageFailure('conflict');
    storage.setItem(STORAGE_KEY, raw);
    const written = storage.getItem(STORAGE_KEY);
    if (written !== raw) throw new StorageFailure('failed');
    await decodeDocument(written);
    // A non-cooperating writer may have run during asynchronous verification.
    if (storage.getItem(STORAGE_KEY) !== raw)
      throw new StorageFailure('conflict');
    return { [STORAGE_KEY]: raw };
  });
}
