import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createTranslator, detectLocale, LOCALES, weekdays } from './i18n';
import { messages } from './messages';
import { createWorkbook, headersFor, parseRows, readImport } from './importer';
import { SAMPLE_COURSES, parseWeeks } from './schedule';

test('language detection honors browser priority, script, and regional variants', () => {
  for (const [languages, expected] of [
    [['en-GB'], 'en'],
    [['zh-SG'], 'zh-CN'],
    [['zh-HK'], 'zh-TW'],
    [['zh-MO'], 'zh-TW'],
    [['zh-Hant'], 'zh-TW'],
    [['zh-Hans-HK'], 'zh-CN'],
    [['fr', 'zh-TW', 'en'], 'zh-TW'],
    [['de'], 'zh-CN'],
    [[], 'zh-CN'],
  ] as const)
    assert.equal(detectLocale(languages), expected);
  assert.equal(weekdays('en')[0], 'Mon');
  assert.equal(weekdays('zh-TW')[0], '週一');
});

test('translations preserve interpolation tokens and literal user content', () => {
  const placeholders = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [key, values] of Object.entries(messages)) {
    for (const value of values) {
      assert.ok(value.trim(), key);
      assert.deepEqual(placeholders(value), placeholders(key), key);
    }
    assert.doesNotMatch(values[0], /[\u3400-\u9fff]/, key);
  }
  const text = '<script> $& {1} 大学英语';
  assert.equal(
    createTranslator('en')('第 {0} 行：{1}', { 0: 4, 1: text }),
    `Row 4: ${text}`,
  );
  for (const name of [
    'App.tsx',
    'schedule.ts',
    'importer.ts',
    'LocaleProvider.tsx',
  ]) {
    const source = readFileSync(new URL(name, import.meta.url), 'utf8');
    for (const match of source.matchAll(/\bt\(\s*(['"])(.*?)\1/gs)) {
      assert.ok(Object.hasOwn(messages, match[2]), `${name}: ${match[2]}`);
    }
  }
});

test('all three week notations work independently of the interface language', () => {
  for (const locale of LOCALES) {
    for (const value of [
      '第1-6周（单）',
      '第1-6週（單）',
      '1-6(odd)',
      '1-6(ODD)',
    ]) {
      assert.deepEqual(parseWeeks(value, 20, locale), [1, 3, 5]);
    }
    for (const value of ['2-6(双)', '2-6(雙)', '2-6(even)']) {
      assert.deepEqual(parseWeeks(value, 20, locale), [2, 4, 6]);
    }
    assert.throws(() => parseWeeks('1-6(odd雙)', 20, locale));
  }
  assert.throws(
    () => parseWeeks('1-21', 20, 'en'),
    /Weeks must be between 1 and 20/,
  );
  assert.throws(() => parseWeeks('1-21', 20, 'zh-TW'), /週次應在/);
});

test('localized Excel templates and exports round-trip without translating course data', async () => {
  const course = {
    ...SAMPLE_COURSES[0],
    name: '大学英语',
    teacher: '林悦',
    room: '地點 Room',
    note: 'Keep $& {0} literal',
  };
  for (const locale of LOCALES) {
    for (const courses of [undefined, [course]]) {
      const workbook = createWorkbook(courses, locale);
      const bytes = await workbook.xlsx.writeBuffer();
      const result = await readImport(
        new File([bytes as BlobPart], 'roundtrip.xlsx'),
        20,
        locale,
      );
      assert.deepEqual(result.errors, []);
      assert.equal(result.courses.length, 1);
      if (courses) {
        for (const field of [
          'name',
          'teacher',
          'room',
          'note',
          'day',
          'start',
          'end',
          'weeks',
        ] as const) {
          assert.deepEqual(result.courses[0][field], course[field]);
        }
      }
    }
  }
});

test('import accepts traditional aliases and localizes row errors and missing headers', () => {
  const result = parseRows(
    [
      [],
      [
        '課程名',
        '週幾',
        '起始節次',
        '結束節',
        '上課週次',
        '地點',
        '老師',
        '備註',
      ],
      ['語言', '禮拜一', 1, 2, '1-8(雙)', '教室', '老師', '筆記'],
      ['Bad', '週一', 3, 2, '1-8'],
    ],
    20,
    'Sheet',
    'en',
  );
  assert.deepEqual(result.courses[0].weeks, [2, 4, 6, 8]);
  assert.equal(result.courses[0].note, '筆記');
  assert.match(result.errors[0], /^Row 4: Periods must/);
  assert.throws(
    () => parseRows([['name'], ['Course']], 20, 'CSV', 'en'),
    /Missing required columns: day, start, end, weeks/,
  );
  const traditional = parseRows(
    [headersFor('zh-TW'), ['名稱', '週一', 2, 1, '1-2']],
    20,
    'CSV',
    'zh-TW',
  );
  assert.match(traditional.errors[0], /^第 2 列：節次/);
});
