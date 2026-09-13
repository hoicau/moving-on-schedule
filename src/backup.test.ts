import assert from 'node:assert/strict';
import test from 'node:test';
import { createBackup, backupUserData } from './backup';
import { readBackup, verifyBackup } from './backupImport';
import { defaultUserData } from './userData';
import { checksum } from './integrity';
import { LOCALES } from './i18n';
import { COLORS } from './schedule';
import { readFile } from 'node:fs/promises';
import { upcomingCourses } from './occurrences';
import { localDate } from './schedule';

test('JSON round-trip preserves every course field, both timing types, settings, and preferences', async () => {
  for (const locale of LOCALES)
    for (const theme of ['light', 'dark', 'system'] as const) {
      const data = defaultUserData(locale);
      data.preferences = {
        locale,
        theme,
        display: { showRemarks: true, showWeekend: false, showTeacher: true },
      };
      data.schedule.isDemo = false;
      data.schedule.settings.semester = '自定义學期 "Fall"';
      data.schedule.settings.startDate = '2026-12-31';
      data.schedule.settings.periods[0] = { start: '08:00', end: '' };
      data.schedule.courses = COLORS.map((color, index) => ({
        ...data.schedule.courses[0],
        id: `custom-${index}`,
        color,
        weeks: [1, 3, 7],
        name: '原文 <script> $&',
        note: '第一行\nSecond line, "quoted"',
        ...(index % 2
          ? { timing: 'time' as const, start: '10:00', end: '11:30' }
          : { timing: 'period' as const, start: 1, end: 2 }),
      }));
      const original = structuredClone(data);
      const backup = await createBackup(
        data.schedule,
        data.preferences,
        new Date('2026-09-13T00:00:00Z'),
      );
      const restored = backupUserData(
        await readBackup(new File([JSON.stringify(backup)], 'backup.json')),
      );
      assert.deepEqual(restored, original);
      assert.deepEqual(data, original);
      backup.schedule.courses[0].weeks.push(9);
      backup.preferences.display.showRemarks = false;
      assert.deepEqual(data, original);
    }
});

test('demo and empty backups retain their identity, raw text, blank times, and defaults', async () => {
  for (const isDemo of [true, false]) {
    const data = defaultUserData('zh-Hant', isDemo);
    const backup = await createBackup(data.schedule, data.preferences);
    assert.equal(backup.schedule.isDemo, isDemo);
    assert.deepEqual(backup.schedule.settings, data.schedule.settings);
    if (isDemo) {
      assert.equal(backup.schedule.courses[0].name, 'Calculus A');
      assert.equal(backup.schedule.courses[0].timing, 'period');
    } else assert.deepEqual(backup.schedule.courses, []);
    await verifyBackup(backup);
  }
});

test('checksum covers settings, courses, preferences, and export metadata', async () => {
  const data = defaultUserData('en');
  const original = await createBackup(data.schedule, data.preferences);
  for (const mutate of [
    (b: typeof original) => {
      b.schedule.courses[0].note = 'changed';
    },
    (b: typeof original) => {
      b.schedule.settings.semester = 'changed';
    },
    (b: typeof original) => {
      b.preferences.theme = 'dark';
    },
    (b: typeof original) => {
      b.exportedAt = '2026-01-01T00:00:00Z';
    },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    await assert.rejects(verifyBackup(changed), /backup.integrityFailed/);
  }
});

test('schema rejects missing fields, unknown properties, mixed timing and unsupported versions', async () => {
  const data = defaultUserData('en');
  const original = await createBackup(data.schedule, data.preferences);
  for (const value of [
    null,
    [],
    {},
    { ...original, integrity: undefined },
    { ...original, extra: true },
    { ...original, version: 2 },
    { ...original, preferences: { ...original.preferences, locale: 'zh-CN' } },
    {
      ...original,
      schedule: {
        ...original.schedule,
        courses: [{ ...original.schedule.courses[0], end: '10:00' }],
      },
    },
  ])
    await assert.rejects(verifyBackup(value), /backup.(invalid|unsupported)/);
});

test('valid hashes cannot bypass duplicate ids, impossible dates, and cross-field schedule rules', async () => {
  const data = defaultUserData('en');
  const original = await createBackup(data.schedule, data.preferences);
  for (const mutate of [
    (b: typeof original) => {
      b.schedule.courses.push(b.schedule.courses[0]);
    },
    (b: typeof original) => {
      b.schedule.settings.startDate = '2026-02-30';
    },
    (b: typeof original) => {
      b.schedule.settings.totalWeeks = 1;
    },
    (b: typeof original) => {
      b.schedule.settings.periods = [{ start: '', end: '' }];
    },
    (b: typeof original) => {
      b.schedule.courses[0].start = 4;
    },
  ]) {
    const changed = structuredClone(original);
    mutate(changed);
    const { integrity: _integrity, ...content } = changed;
    changed.integrity = await checksum(content);
    await assert.rejects(verifyBackup(changed), /backup.invalid/);
  }
});

test('whitespace, object key order, and UTF-8 BOM do not invalidate a backup', async () => {
  const data = defaultUserData('en');
  const backup = await createBackup(data.schedule, data.preferences);
  const reordered = Object.fromEntries(Object.entries(backup).reverse());
  const parsed = await readBackup(
    new File(['\uFEFF' + JSON.stringify(reordered, null, 4)], 'backup.json'),
  );
  assert.deepEqual(parsed, backup);
  await assert.rejects(
    readBackup(new File(['{broken'], 'broken.json')),
    /backup.invalid/,
  );
  await assert.rejects(
    readBackup({
      size: 50 * 1024 * 1024,
      text: () => {
        throw new Error('Oversized files must be rejected before reading.');
      },
    } as unknown as File),
    /backup.tooLarge/,
  );
});

test('the published example validates, and year-boundary occurrences survive a JSON round trip', async () => {
  await verifyBackup(
    JSON.parse(
      await readFile(
        new URL('../docs/examples/backup-v1.json', import.meta.url),
        'utf8',
      ),
    ),
  );
  const data = defaultUserData('en');
  data.schedule.settings.startDate = '2026-12-31';
  data.schedule.settings.totalWeeks = 3;
  data.schedule.courses = [{ ...data.schedule.courses[0], weeks: [1, 3] }];
  const restored = backupUserData(
    await verifyBackup(await createBackup(data.schedule, data.preferences)),
  );
  const now = new Date('2026-12-30T12:00:00');
  const before = upcomingCourses(
    data.schedule.courses,
    data.schedule.settings,
    now,
  );
  const after = upcomingCourses(
    restored.schedule.courses,
    restored.schedule.settings,
    now,
  );
  assert.deepEqual(
    after.map((entry) => [entry.course.id, entry.week, localDate(entry.date)]),
    before.map((entry) => [entry.course.id, entry.week, localDate(entry.date)]),
  );
  assert.deepEqual(
    after.map((entry) => localDate(entry.date)),
    ['2027-01-11'],
  );
});

test('teacher display remains optional in old backups and rejects invalid values', async () => {
  const data = defaultUserData('en');
  const backup = await createBackup(data.schedule, data.preferences);
  assert.equal(backup.preferences.display.showTeacher, undefined);
  await verifyBackup(backup);
  for (const value of [null, 'true', 1]) {
    const changed = structuredClone(backup);
    Object.assign(changed.preferences.display, { showTeacher: value });
    const { integrity: _integrity, ...content } = changed;
    changed.integrity = await checksum(content);
    await assert.rejects(verifyBackup(changed), /backup.invalid/);
  }
});
