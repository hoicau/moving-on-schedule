import { TIMED_SETTINGS } from './testFixtures';
import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { HEADERS, parseRows, readImport } from './importer';
import {
  DEFAULT_SETTINGS,
  SAMPLE_COURSES,
  conflicts,
  currentWeek,
  dateAtWeek,
  decodeSaved,
  formatWeeks,
  localDate,
  parseWeeks,
  validateSettings,
} from './schedule';

test('week notation supports ranges, specific weeks and odd/even weeks', () => {
  assert.deepEqual(parseWeeks('第1-6周（单）'), [1, 3, 5]);
  assert.deepEqual(parseWeeks('2–8(双)'), [2, 4, 6, 8]);
  assert.deepEqual(parseWeeks('1，3，5-7,3'), [1, 3, 5, 6, 7]);
  assert.equal(formatWeeks([5, 1, 2, 3, 7, 7]), '1-3,5,7');
});
test('invalid and empty week expressions cannot silently become valid', () => {
  for (const value of [
    '',
    '0-3',
    '3-1',
    '1-21',
    '1,',
    '1-2-3',
    'abc',
    '2(单)',
    '单双',
  ])
    assert.throws(() => parseWeeks(value, 20), Error, value);
});
test('week boundaries follow local calendar days and span months', () => {
  assert.equal(
    currentWeek(DEFAULT_SETTINGS, new Date('2026-09-06T23:59:59')),
    0,
  );
  assert.equal(
    currentWeek(DEFAULT_SETTINGS, new Date('2026-09-07T00:00:00')),
    1,
  );
  assert.equal(
    currentWeek(DEFAULT_SETTINGS, new Date('2026-09-13T23:59:59')),
    1,
  );
  assert.equal(
    currentWeek(DEFAULT_SETTINGS, new Date('2026-09-14T00:00:00')),
    2,
  );
  assert.equal(localDate(dateAtWeek(DEFAULT_SETTINGS, 4, 7)), '2026-10-04');
});
test('conflicts require intersecting days, periods and weeks', () => {
  const base = SAMPLE_COURSES[0];
  assert.equal(conflicts({ ...base, id: 'new' }, [base]).length, 1);
  assert.equal(conflicts(base, [base]).length, 0);
  assert.equal(
    conflicts({ ...base, id: 'new', start: 3, end: 4 }, [base]).length,
    0,
  );
  assert.equal(
    conflicts({ ...base, id: 'new', weeks: [17] }, [base]).length,
    0,
  );
  assert.equal(conflicts({ ...base, id: 'new', day: 2 }, [base]).length, 0);
  assert.equal(
    conflicts({ ...base, id: 'new', start: 2, end: 3 }, [base]).length,
    1,
  );
});
test('column order and supported aliases are detected', () => {
  const result = parseRows(
    [
      [
        'teacher',
        'weeks',
        'course name',
        'end period',
        'day',
        'start period',
        'location',
      ],
      ['Ada', '1-8(单)', 'Algorithms', 4, 'Monday', 3, 'A-203'],
    ],
    20,
  );
  assert.equal(result.courses[0].name, 'Algorithms');
  assert.equal(result.courses[0].day, 1);
  assert.equal(result.courses[0].room, 'A-203');
  assert.deepEqual(result.courses[0].weeks, [1, 3, 5, 7]);
  assert.equal(result.errors.length, 0);
});
test('import reports original row numbers and missing headers', () => {
  const result = parseRows(
    [
      [],
      HEADERS,
      ['Valid', '周日', 1, 2, '1-16'],
      ['Bad period', '周一', 3, 2, '1-16'],
      ['Bad day', '周八', 1, 2, '1-16'],
      ['Bad weeks', '周一', 1, 2, '1-21'],
    ],
    20,
  );
  assert.equal(result.courses.length, 1);
  assert.equal(result.rows, 4);
  assert.match(result.errors[0], /^Row 4:/);
  assert.equal(result.errors.length, 3);
  assert.throws(
    () => parseRows([['课程名称'], ['Math']], 20),
    /Missing required columns/,
  );
  assert.throws(() => parseRows([HEADERS], 20), /only has headers/);
});
test('multiple meetings of the same course use a consistent color', () => {
  const result = parseRows(
    [
      HEADERS,
      ['数学', '周一', 1, 2, '1-16'],
      ['英语', '周二', 1, 2, '1-16'],
      ['数学', '周三', 1, 2, '1-16'],
    ],
    20,
  );
  assert.equal(result.courses[0].color, result.courses[2].color);
  assert.notEqual(result.courses[0].color, result.courses[1].color);
});
test('real XLSX bytes survive workbook parsing and preserve row values', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Empty');
  const sheet = workbook.addWorksheet('秋季');
  sheet.addRow(HEADERS);
  sheet.addRow(['数学', '周一', 1, 2, '1-16(单)', 'A-302', '陈老师', '带教材']);
  const bytes = await workbook.xlsx.writeBuffer();
  const file = new File([bytes as BlobPart], 'courses.xlsx');
  const result = await readImport(file, 20);
  assert.equal(result.sheet, '秋季');
  assert.equal(result.errors.length, 0);
  assert.equal(result.courses[0].note, '带教材');
  assert.equal(result.courses[0].weeks.length, 8);
});
test('CSV with BOM, commas and quoted newlines parses correctly', async () => {
  const file = new File(
    [
      '\uFEFF课程名称,星期,开始节次,结束节次,周次,教室,教师,备注\r\n"Design, Thinking",Fri,5,6,"1,3,5",Studio,Ada,"Line 1\nLine 2"',
    ],
    'courses.csv',
  );
  const result = await readImport(file, 20);
  assert.equal(result.errors.length, 0);
  assert.equal(result.courses[0].name, 'Design, Thinking');
  assert.equal(result.courses[0].day, 5);
  assert.equal(result.courses[0].note, 'Line 1\nLine 2');
  await assert.rejects(
    () => readImport(new File(['invalid'], 'legacy.xls'), 20),
    /legacy/,
  );
});
test('saved data validates schema and rejects corrupt or duplicate courses', () => {
  const data = {
    version: 1,
    courses: SAMPLE_COURSES,
    settings: DEFAULT_SETTINGS,
    isDemo: true,
  };
  assert.deepEqual(decodeSaved(JSON.stringify(data)), data);
  assert.throws(() => decodeSaved('{broken'));
  assert.throws(() => decodeSaved(JSON.stringify({ ...data, version: 2 })));
  assert.throws(
    () =>
      decodeSaved(
        JSON.stringify({
          ...data,
          courses: [SAMPLE_COURSES[0], SAMPLE_COURSES[0]],
        }),
      ),
    /duplicated/,
  );
});
test('settings prevent invalid semester boundaries and overlapping class times', () => {
  assert.doesNotThrow(() => validateSettings(DEFAULT_SETTINGS));
  assert.doesNotThrow(() =>
    validateSettings({ ...DEFAULT_SETTINGS, startDate: '2026-09-08' }),
  );
  assert.throws(
    () => validateSettings({ ...DEFAULT_SETTINGS, startDate: '2026-02-30' }),
    /valid first day/,
  );
  assert.throws(() =>
    validateSettings({ ...DEFAULT_SETTINGS, totalWeeks: 31 }),
  );
  const settings = structuredClone(TIMED_SETTINGS);
  settings.periods[1].start = '08:30';
  assert.throws(() => validateSettings(settings), /cannot overlap/);
});

test('daily times allow blanks while validating every filled value and ordering', () => {
  const settings = structuredClone(DEFAULT_SETTINGS);
  assert.doesNotThrow(() => validateSettings(settings));
  settings.periods[0].start = '08:00';
  settings.periods[2].end = '10:45';
  assert.doesNotThrow(() => validateSettings(settings));
  settings.periods[3].start = '10:00';
  assert.throws(() => validateSettings(settings), /cannot overlap/);
  settings.periods[3].start = '25:00';
  assert.throws(() => validateSettings(settings), /valid time/);
  settings.periods[3].start = '11:00';
  settings.periods[3].end = '11:00';
  assert.throws(() => validateSettings(settings), /cannot overlap/);
  const raw = JSON.stringify({
    version: 1,
    isDemo: false,
    courses: SAMPLE_COURSES,
    settings: TIMED_SETTINGS,
  });
  assert.deepEqual(decodeSaved(raw).settings.periods, TIMED_SETTINGS.periods);
});
