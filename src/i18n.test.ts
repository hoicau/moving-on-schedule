import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  createTranslator,
  detectLocale,
  normalizeLocale,
  LOCALES,
  weekdays,
} from './i18n';
import { en, translations } from './messages';
import { localizeDemoText } from './demoText';
import { createWorkbook, headersFor, parseRows, readImport } from './importer';
import { SAMPLE_COURSES, parseWeeks } from './schedule';

test('language detection honors browser priority, script, and regional variants', () => {
  for (const [languages, expected] of [
    [['en-GB'], 'en'],
    [['zh-SG'], 'zh-Hans'],
    [['zh-HK'], 'zh-Hant'],
    [['zh-MO'], 'zh-Hant'],
    [['zh-Hant'], 'zh-Hant'],
    [['zh-Hans-HK'], 'zh-Hans'],
    [['fr', 'zh-Hant', 'en'], 'zh-Hant'],
    [['de'], 'en'],
    [[], 'en'],
  ] as const)
    assert.equal(detectLocale(languages), expected);
  assert.equal(weekdays('en')[0], 'Mon');
  assert.equal(weekdays('zh-Hant')[0], '週一');
});

test('translations preserve interpolation tokens and literal user content', () => {
  const placeholders = (s: string) =>
    [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [key, source] of Object.entries(en)) {
    assert.doesNotMatch(source, /[\u3400-\u9fff]/, key);
    for (const catalog of Object.values(translations)) {
      assert.deepEqual(Object.keys(catalog).sort(), Object.keys(en).sort());
      const value = catalog[key as keyof typeof en];
      assert.ok(value.trim(), key);
      assert.deepEqual(placeholders(value), placeholders(source), key);
    }
  }
  const text = '<script> $& {1} 大学英语';
  assert.equal(
    createTranslator('en')('import.rowError', { 0: 4, 1: text }),
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
      assert.ok(Object.hasOwn(en, match[2]), `${name}: ${match[2]}`);
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
  assert.throws(() => parseWeeks('1-21', 20, 'zh-Hant'), /週次應在/);
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
    [headersFor('zh-Hant'), ['名稱', '週一', 2, 1, '1-2']],
    20,
    'CSV',
    'zh-Hant',
  );
  assert.match(traditional.errors[0], /^第 2 列：節次/);
});

test('missing translations fall back to English and built-in demo aliases remain compatible', () => {
  const catalog = translations['zh-Hant'];
  const saved = catalog['course.remark'];
  try {
    Reflect.deleteProperty(catalog, 'course.remark');
    assert.equal(createTranslator('zh-Hant')('course.remark'), 'Remark');
    assert.equal(createTranslator('zh-Hans')('toString'), 'toString');
  } finally {
    catalog['course.remark'] = saved;
  }
  assert.equal(localizeDemoText('高等数学 A', 'en'), 'Calculus A');
  assert.equal(localizeDemoText('Calculus A', 'zh-Hant'), '高等數學 A');
});

test('new remark header and legacy note headers preserve the same user content', () => {
  for (const header of ['remark', 'remarks', 'note', 'notes', '备注', '備註']) {
    const result = parseRows(
      [
        ['name', 'day', 'start', 'end', 'weeks', header],
        ['Calculus', 'Mon', 1, 2, '1-2', 'Bring notes $& {0}'],
      ],
      20,
    );
    assert.deepEqual(result.errors, []);
    assert.equal(result.courses[0].note, 'Bring notes $& {0}');
  }
  assert.equal(headersFor('en').at(-1), 'remark');
});

test('legacy saved locales normalize to script tags', () => {
  assert.equal(normalizeLocale('zh-CN'), 'zh-Hans');
  assert.equal(normalizeLocale('zh-TW'), 'zh-Hant');
  for (const locale of LOCALES) assert.equal(normalizeLocale(locale), locale);
  assert.equal(normalizeLocale('fr'), undefined);
  assert.equal(normalizeLocale(null), undefined);
});
