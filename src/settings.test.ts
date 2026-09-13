import assert from 'node:assert/strict';
import test from 'node:test';
import {
  courseOccursInWeek,
  courseOverlap,
  currentWeek,
  dateAtWeek,
  decodeSaved,
  DEFAULT_SETTINGS,
  getPeriodBreaks,
  localDate,
  parseCourseTiming,
  SAMPLE_COURSES,
  validateSettings,
  weekElapsedPercent,
} from './schedule';
import { createWorkbook, readImport } from './importer';
import { recentCourses } from './occurrences';
import { TIMED_SETTINGS } from './testFixtures';

test('period breaks require a known gap between adjacent bell times', () => {
  assert.deepEqual(
    getPeriodBreaks(DEFAULT_SETTINGS.periods),
    Array(12).fill(false),
  );
  assert.deepEqual(
    getPeriodBreaks([
      { start: '08:00', end: '08:45' },
      { start: '08:45', end: '09:30' },
      { start: '09:31', end: '10:15' },
      { start: '13:00', end: '' },
      { start: '14:00', end: '14:45' },
      { start: '', end: '15:30' },
      { start: '15:30', end: '16:15' },
    ]),
    [false, false, true, true, false, false, false],
  );
});

test('period breaks follow edited times at any configured period', () => {
  const periods = Array.from({ length: 30 }, () => ({ start: '', end: '' }));
  periods[28] = { start: '21:00', end: '21:45' };
  periods[29] = { start: '22:00', end: '22:45' };
  assert.deepEqual(getPeriodBreaks(periods), [...Array(29).fill(false), true]);
  periods[29].start = '21:45';
  assert.deepEqual(getPeriodBreaks(periods), Array(30).fill(false));
});

test('week journey starts at midnight and clamps past and future weeks', () => {
  const settings = { ...DEFAULT_SETTINGS, startDate: '2026-09-07' };
  const progress = (date: string) =>
    weekElapsedPercent(settings, 1, new Date(date));
  assert.equal(progress('2026-09-06T23:59:59'), 0);
  assert.equal(progress('2026-09-07T00:00:00'), 0);
  assert.equal(progress('2026-09-10T12:00:00'), 50);
  assert.equal(progress('2026-09-12T00:00:00'), 71);
  assert.equal(progress('2026-09-12T12:00:00'), 78);
  assert.equal(progress('2026-09-13T23:59:59'), 99);
  assert.equal(progress('2026-09-14T00:00:00'), 100);
  assert.equal(
    weekElapsedPercent(settings, 2, new Date('2026-09-12T12:00:00')),
    0,
  );
});

test('first-week journey uses the actual semester start at midnight', () => {
  const settings = { ...DEFAULT_SETTINGS, startDate: '2026-09-09' };
  assert.equal(
    weekElapsedPercent(settings, 1, new Date('2026-09-09T00:00:00')),
    0,
  );
  assert.equal(
    weekElapsedPercent(settings, 1, new Date('2026-09-11T12:00:00')),
    50,
  );
  assert.equal(
    weekElapsedPercent(settings, 1, new Date('2026-09-14T00:00:00')),
    100,
  );
});

test('daily periods support one through thirty rows and preserve saved bell times', () => {
  for (const count of [1, 8, 16, 30]) {
    const settings = {
      ...DEFAULT_SETTINGS,
      periods: Array.from({ length: count }, () => ({ start: '', end: '' })),
    };
    settings.periods[count - 1] = { start: '22:00', end: '22:45' };
    const course = {
      ...SAMPLE_COURSES[0],
      ...parseCourseTiming(String(count), String(count), 'en', count),
    };
    const saved = { version: 1, isDemo: false, settings, courses: [course] };
    assert.deepEqual(decodeSaved(JSON.stringify(saved)), saved);
    assert.throws(() => parseCourseTiming('1', String(count + 1), 'en', count));
    assert.throws(() =>
      decodeSaved(
        JSON.stringify({ ...saved, courses: [{ ...course, end: count + 1 }] }),
      ),
    );
  }
  for (const count of [0, 31])
    assert.throws(() =>
      validateSettings({
        ...DEFAULT_SETTINGS,
        periods: Array.from({ length: count }, () => ({ start: '', end: '' })),
      }),
    );
});

test('Excel and CSV imports validate against the configured period count', async () => {
  const course = { ...SAMPLE_COURSES[0], start: 15, end: 16 };
  const bytes = await createWorkbook([course], 'en').xlsx.writeBuffer();
  const file = new File([bytes as BlobPart], 'sixteen.xlsx');
  const imported = await readImport(file, 20, 'en', 16);
  assert.deepEqual(imported.errors, []);
  assert.equal(imported.courses[0].end, 16);
  assert.equal((await readImport(file, 20, 'en', 12)).errors.length, 1);
  const csv = new File(
    ['name,day,start,end,weeks\nSingle,Mon,1,1,1-2'],
    'one.csv',
  );
  assert.equal((await readImport(csv, 20, 'en', 1)).courses[0].end, 1);
});

test('a one-period timetable gets a usable Excel template', async () => {
  const bytes = await createWorkbook(
    undefined,
    'zh-Hans',
    1,
  ).xlsx.writeBuffer();
  const result = await readImport(
    new File([bytes as BlobPart], 'template.xlsx'),
    20,
    'zh-Hans',
    1,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.courses[0].end, 1);
});

test('a midweek semester start preserves weekdays and counts partial first weeks', () => {
  const settings = {
    ...TIMED_SETTINGS,
    startDate: '2026-10-01',
    totalWeeks: 2,
  };
  assert.doesNotThrow(() => validateSettings(settings));
  assert.equal(localDate(dateAtWeek(settings, 1)), '2026-09-28');
  assert.equal(localDate(dateAtWeek(settings, 1, 4)), '2026-10-01');
  assert.equal(currentWeek(settings, new Date('2026-09-30T23:59:59')), 0);
  assert.equal(currentWeek(settings, new Date('2026-10-01T00:00:00')), 1);
  assert.equal(currentWeek(settings, new Date('2026-10-04T23:59:59')), 1);
  assert.equal(currentWeek(settings, new Date('2026-10-05T00:00:00')), 2);
  assert.equal(currentWeek(settings, new Date('2026-10-12T00:00:00')), 3);
  const monday = { ...SAMPLE_COURSES[0], weeks: [1, 2] };
  const thursday = { ...monday, id: 'thursday', day: 4 };
  assert.equal(courseOccursInWeek(monday, settings, 1), false);
  assert.equal(courseOccursInWeek(monday, settings, 2), true);
  assert.equal(courseOccursInWeek(thursday, settings, 1), true);
  const next = recentCourses(
    [monday, thursday],
    settings,
    new Date('2026-09-27T12:00:00'),
  ).next;
  assert.deepEqual(
    next.map((entry) => entry.course.id),
    ['thursday'],
  );
  assert.equal(localDate(next[0].date), '2026-10-01');
  assert.equal(
    courseOverlap(
      { ...monday, weeks: [1] },
      { ...monday, id: 'overlap', weeks: [1] },
      settings,
    ),
    false,
  );
});

test('a Sunday start has a one-day first week and retains future Monday courses', () => {
  const settings = { ...TIMED_SETTINGS, startDate: '2026-09-13' };
  const course = { ...SAMPLE_COURSES[0], weeks: [1, 2] };
  assert.equal(currentWeek(settings, new Date('2026-09-13T23:59:59')), 1);
  const next = recentCourses(
    [course],
    settings,
    new Date('2026-09-12T12:00:00'),
  ).next;
  assert.equal(next[0].week, 2);
  assert.equal(localDate(next[0].date), '2026-09-14');
});
