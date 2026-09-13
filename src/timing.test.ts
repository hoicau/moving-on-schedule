import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { LOCALES } from './i18n';
import { createWorkbook, parseRows, readImport } from './importer';
import {
  courseOverlap,
  DEFAULT_SETTINGS,
  decodeSaved,
  parseCourseTiming,
  SAMPLE_COURSES,
  validateCourse,
  type Course,
} from './schedule';
import { recentCourses } from './occurrences';
import { TIMED_SETTINGS } from './testFixtures';

const timed: Extract<Course, { timing: 'time' }> = {
  ...SAMPLE_COURSES[0],
  timing: 'time',
  start: '08:00',
  end: '09:40',
  id: 'clock',
};

test('combined timing inputs distinguish periods from normalized 24-hour times', () => {
  assert.deepEqual(parseCourseTiming(' 01 ', '2'), {
    timing: 'period',
    start: 1,
    end: 2,
  });
  assert.deepEqual(parseCourseTiming('8:00', '09:40'), {
    timing: 'time',
    start: '08:00',
    end: '09:40',
  });
  assert.deepEqual(parseCourseTiming('00:00', '23:59'), {
    timing: 'time',
    start: '00:00',
    end: '23:59',
  });
  for (const [start, end] of [
    ['', '2'],
    ['1', '09:40'],
    ['08:00', '2'],
    ['1.5', '2'],
    ['24:00', '25:00'],
    ['08:60', '09:00'],
    ['8am', '9am'],
    ['09:00', '08:00'],
    ['08:00', '08:00'],
    ['0', '2'],
    ['1', '13'],
  ]) {
    assert.throws(() => parseCourseTiming(start, end));
  }
  assert.doesNotThrow(() => validateCourse(timed));
  assert.throws(() => validateCourse({ ...timed, end: '08:00' }));
});

test('clock courses work without daily times and persist alongside old period courses', () => {
  const data = {
    version: 1,
    isDemo: false,
    settings: DEFAULT_SETTINGS,
    courses: [SAMPLE_COURSES[0], timed],
  };
  assert.deepEqual(decodeSaved(JSON.stringify(data)), data);
  const during = recentCourses(
    data.courses,
    DEFAULT_SETTINGS,
    new Date('2026-09-07T08:00:00'),
  );
  assert.equal(during.current[0].course.id, timed.id);
  assert.equal(during.untimed[0].course.id, SAMPLE_COURSES[0].id);
  assert.equal(
    recentCourses([timed], DEFAULT_SETTINGS, new Date('2026-09-07T09:40:00'))
      .current.length,
    0,
  );
  const future = recentCourses(
    data.courses,
    DEFAULT_SETTINGS,
    new Date('2026-09-06T12:00:00'),
  );
  assert.equal(
    future.next.length,
    0,
    'Do not guess which timing kind is first without bell times',
  );
});

test('mixed timing conflicts use bell times, preserve uncertainty and allow back-to-back clocks', () => {
  const period = SAMPLE_COURSES[0];
  assert.equal(courseOverlap(timed, period, DEFAULT_SETTINGS), undefined);
  assert.equal(courseOverlap(timed, period, TIMED_SETTINGS), true);
  assert.equal(
    courseOverlap(timed, {
      ...timed,
      id: 'later',
      start: '09:40',
      end: '10:00',
    }),
    false,
  );
  assert.equal(
    courseOverlap(timed, {
      ...timed,
      id: 'overlap',
      start: '09:39',
      end: '10:00',
    }),
    true,
  );
  assert.equal(
    courseOverlap(timed, { ...period, day: 2 }, DEFAULT_SETTINGS),
    false,
  );
});

test('both timing kinds survive localized Excel export and import', async () => {
  for (const locale of LOCALES) {
    const source = [SAMPLE_COURSES[0], { ...timed, note: 'Clock remark' }];
    const bytes = await createWorkbook(source, locale).xlsx.writeBuffer();
    const imported = await readImport(
      new File([bytes as BlobPart], 'mixed.xlsx'),
      20,
      locale,
    );
    assert.deepEqual(imported.errors, []);
    assert.equal(imported.courses[0].start, 1);
    assert.equal(imported.courses[1].timing, 'time');
    assert.equal(imported.courses[1].start, '08:00');
    assert.equal(imported.courses[1].end, '09:40');
    assert.equal(imported.courses[1].note, 'Clock remark');
  }
  const mixed = parseRows(
    [
      ['name', 'day', 'start', 'end', 'weeks'],
      ['Bad', 'Mon', 1, '09:40', '1-2'],
    ],
    20,
  );
  assert.equal(mixed.courses.length, 0);
  assert.equal(mixed.errors.length, 1);
});

test('Excel clock-formatted cells and combined Chinese headers are accepted', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Times');
  sheet.addRow(['课程名称', '星期', '开始时间/节次', '结束时间/节次', '周次']);
  const row = sheet.addRow([
    'Clock course',
    'Mon',
    new Date('1899-12-30T08:00:00Z'),
    new Date('1899-12-30T09:40:00Z'),
    '1-2',
  ]);
  row.getCell(3).numFmt = 'hh:mm';
  row.getCell(4).numFmt = 'hh:mm';
  const bytes = await workbook.xlsx.writeBuffer();
  const imported = await readImport(
    new File([bytes as BlobPart], 'times.xlsx'),
    20,
  );
  assert.deepEqual(imported.errors, []);
  assert.equal(imported.courses[0].start, '08:00');
  assert.equal(imported.courses[0].end, '09:40');
});
