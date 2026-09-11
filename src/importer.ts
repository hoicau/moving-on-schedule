import { createTranslator, weekdays, type Locale } from './i18n';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import {
  COLORS,
  DEFAULT_SETTINGS,
  formatWeeks,
  parseWeeks,
  parseCourseTiming,
  validateCourse,
  type Course,
} from './schedule';

export const HEADERS = [
  '课程名称',
  '星期',
  '开始时间/节次',
  '结束时间/节次',
  '周次',
  '教室',
  '教师',
  '备注',
];
const ALIASES = [
  [
    '课程名称',
    '课程名',
    '課程名稱',
    '課程名',
    '課程',
    '课程',
    'name',
    'course',
    'coursename',
  ],
  ['星期', '星期几', '周几', '週幾', 'day', 'weekday'],
  [
    '开始节次',
    '开始节',
    '起始节次',
    '開始節次',
    '開始節',
    '起始節次',
    '开始时间/节次',
    '開始時間/節次',
    '开始时间',
    '開始時間',
    'starttime',
    'start',
    'startperiod',
  ],
  [
    '结束节次',
    '结束节',
    '結束節次',
    '結束節',
    '结束时间/节次',
    '結束時間/節次',
    '结束时间',
    '結束時間',
    'endtime',
    'end',
    'endperiod',
  ],
  ['周次', '上课周次', '週次', '上課週次', 'weeks'],
  ['教室', '地点', '上课地点', '地點', '上課地點', 'room', 'location'],
  ['教师', '老师', '任课教师', '教師', '老師', '任課教師', 'teacher'],
  ['备注', '備註', 'remark', 'remarks', 'note', 'notes'],
];
export type ImportResult = {
  courses: Course[];
  errors: string[];
  rows: number;
  sheet: string;
};
function value(cell: unknown): string {
  if (cell == null) return '';
  if (cell instanceof Date && Number.isFinite(cell.getTime()))
    return `${String(cell.getUTCHours()).padStart(2, '0')}:${String(cell.getUTCMinutes()).padStart(2, '0')}`;
  if (typeof cell === 'object') {
    if ('richText' in cell)
      return (cell as { richText: { text: string }[] }).richText
        .map((v) => v.text)
        .join('');
    if ('result' in cell)
      return String((cell as { result: unknown }).result ?? '');
    if ('text' in cell) return String((cell as { text: unknown }).text ?? '');
  }
  return String(cell).trim();
}
function parseDay(raw: string): number {
  if (/^[1-7]$/.test(raw)) return Number(raw);
  const day = raw.replace(/星期|礼拜|禮拜|周|週/g, '');
  const index = ['一', '二', '三', '四', '五', '六', '日'].indexOf(
    day === '天' ? '日' : day,
  );
  if (index >= 0) return index + 1;
  return (
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ].findIndex(
      (d) => d === raw.toLowerCase() || d.slice(0, 3) === raw.toLowerCase(),
    ) + 1
  );
}
export function parseRows(
  rows: unknown[][],
  totalWeeks: number,
  sheet = 'CSV',
  locale: Locale = 'en',
  maxPeriods = DEFAULT_SETTINGS.periods.length,
): ImportResult {
  const t = createTranslator(locale);
  const first = rows.findIndex((row) => row.some((cell) => value(cell)));
  if (first < 0) throw new Error(t('ui.noCourseDataWasFoundInThisFile'));
  const headers = rows[first].map((c) =>
    value(c).toLowerCase().replace(/[\s_]/g, ''),
  );
  const columns = ALIASES.map((names) =>
    headers.findIndex((h) => names.includes(h)),
  );
  const missing = columns
    .slice(0, 5)
    .flatMap((c, i) => (c < 0 ? [headersFor(locale)[i]] : []));
  if (missing.length)
    throw new Error(
      t('ui.missingRequiredColumnsUseTheImportTemplateOrRename', {
        0: missing.join(locale === 'en' ? ', ' : '、'),
      }),
    );
  const courses: Course[] = [],
    errors: string[] = [];
  let count = 0;
  const courseColors = new Map<string, (typeof COLORS)[number]>();
  rows.slice(first + 1).forEach((row, i) => {
    if (!row.some((cell) => value(cell))) return;
    count++;
    const get = (col: number) =>
      columns[col] < 0 ? '' : value(row[columns[col]]);
    try {
      const course: Course = {
        id: crypto.randomUUID(),
        name: get(0),
        day: parseDay(get(1)),
        ...parseCourseTiming(get(2), get(3), locale, maxPeriods),
        weeks: parseWeeks(get(4), totalWeeks, locale),
        room: get(5),
        teacher: get(6),
        note: get(7),
        color: COLORS[courses.length % COLORS.length],
      };
      validateCourse(course, totalWeeks, locale, maxPeriods);
      if (!courseColors.has(course.name))
        courseColors.set(
          course.name,
          COLORS[courseColors.size % COLORS.length],
        );
      course.color = courseColors.get(course.name)!;
      courses.push(course);
    } catch (error) {
      errors.push(
        t('import.rowError', {
          0: first + i + 2,
          1: error instanceof Error ? error.message : t('ui.invalidData'),
        }),
      );
    }
  });
  if (!count) throw new Error(t('ui.thisFileOnlyHasHeadersAddAtLeastOne'));
  if (count > 2000) throw new Error(t('ui.importUpTo2000MeetingsAtATime'));
  return { courses, errors, rows: count, sheet };
}
export async function readImport(
  file: File,
  totalWeeks: number,
  locale: Locale = 'en',
  maxPeriods = DEFAULT_SETTINGS.periods.length,
): Promise<ImportResult> {
  const t = createTranslator(locale);
  if (file.size > 10 * 1024 * 1024)
    throw new Error(t('ui.uploadAFileNoLargerThan10Mb'));
  if (/\.csv$/i.test(file.name)) {
    const parsed = Papa.parse<string[]>(await file.text(), {
      skipEmptyLines: true,
    });
    if (parsed.errors.length)
      throw new Error(t('ui.csvFormatError', { 0: parsed.errors[0].message }));
    return parseRows(parsed.data, totalWeeks, 'CSV', locale, maxPeriods);
  }
  if (!/\.xlsx$/i.test(file.name))
    throw new Error(t('ui.useXlsxOrUtf8CsvSaveLegacyXls'));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets.find((s) => s.actualRowCount > 0);
  if (!sheet) throw new Error(t('ui.theWorkbookContainsNoData'));
  if (sheet.rowCount > 2001)
    throw new Error(t('ui.importUpTo2000MeetingsAtATime'));
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    rows.push(Array.isArray(row.values) ? row.values.slice(1) : []);
  });
  return parseRows(rows, totalWeeks, sheet.name, locale, maxPeriods);
}
export function createWorkbook(
  courses?: Course[],
  locale: Locale = 'en',
  maxPeriods = DEFAULT_SETTINGS.periods.length,
): ExcelJS.Workbook {
  const t = createTranslator(locale);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(
    courses ? t('schedule.title') : t('ui.courseImportTemplate'),
  );
  sheet.addRow(headersFor(locale));
  if (courses)
    courses.forEach((c) =>
      sheet.addRow([
        c.name,
        weekdays(locale)[c.day - 1],
        c.start,
        c.end,
        formatWeeks(c.weeks),
        c.room,
        c.teacher,
        c.note,
      ]),
    );
  else
    sheet.addRow([
      t('ui.calculus'),
      t('ui.mon'),
      1,
      Math.min(2, maxPeriods),
      '1-16',
      t('ui.scienceA302'),
      t('ui.drChen'),
      t('ui.exampleRowReplaceOrDelete'),
    ]);
  sheet.columns.forEach(
    (column, i) => (column.width = [26, 12, 14, 14, 24, 24, 18, 36][i]),
  );
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF285679' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFB8DFFF' },
    };
  });
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  return workbook;
}
export async function downloadWorkbook(
  courses?: Course[],
  locale: Locale = 'en',
  maxPeriods = DEFAULT_SETTINGS.periods.length,
): Promise<void> {
  const t = createTranslator(locale);
  const workbook = createWorkbook(courses, locale, maxPeriods);
  const bytes = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = courses
    ? 'Moving-on-Schedule.xlsx'
    : t('ui.movingOnTemplateXlsx');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function headersFor(locale: Locale): string[] {
  if (locale === 'en')
    return [
      'name',
      'day',
      'start',
      'end',
      'weeks',
      'room',
      'teacher',
      'remark',
    ];
  const t = createTranslator(locale);
  return [
    'course.name',
    'ui.day',
    'timing.start',
    'timing.end',
    'ui.weeks',
    'ui.room',
    'course.teacher',
    'course.remark',
  ].map((key) => t(key));
}
