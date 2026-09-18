import { createTranslator, type Locale } from './i18n';
export const COLORS = [
  'sage',
  'peach',
  'lavender',
  'blue',
  'yellow',
  'rose',
] as const;
export type Color = (typeof COLORS)[number];
export type CourseTiming =
  | { timing?: 'period'; start: number; end: number }
  | { timing: 'time'; start: string; end: string };
export type Course = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  day: number;
  weeks: number[];
  color: Color;
  note: string;
  // Existing schedules omit this field and remain visible.
  hidden?: boolean;
} & CourseTiming;
export type PeriodCourse = Course & {
  start: number;
  end: number;
  timing?: 'period';
};
export function isPeriodCourse(course: Course): course is PeriodCourse {
  return course.timing !== 'time';
}
export type Settings = {
  semester: string;
  startDate: string;
  totalWeeks: number;
  periods: { start: string; end: string }[];
};
export type SavedData = {
  version: 1;
  courses: Course[];
  settings: Settings;
  isDemo: boolean;
};
export const MAX_PERIODS = 30;
export const DEFAULT_SETTINGS: Settings = {
  semester: '2026 - 2027 Fall semester',
  startDate: '2026-09-07',
  totalWeeks: 20,
  periods: Array.from({ length: 12 }, () => ({ start: '', end: '' })),
};

export function getPeriodBreaks(periods: Settings['periods']): boolean[] {
  return periods.map((period, index) => {
    const previousEnd = periods[index - 1]?.end;
    // Validated HH:mm strings sort chronologically; unknown times imply no gap.
    return Boolean(previousEnd && period.start && period.start > previousEnd);
  });
}

const allWeeks = Array.from({ length: 16 }, (_, i) => i + 1);
export const SAMPLE_COURSES: PeriodCourse[] = [
  ['Calculus A', 'Chen Ming', 'Science A-302', 1, 1, 2, 'sage'],
  ['College English', 'Lin Yue', 'Humanities B-201', 1, 5, 6, 'peach'],
  ['Design Thinking', 'Zhou Jia', 'Creative Studio 203', 2, 3, 4, 'lavender'],
  ['Python Programming', 'Wang Yu', 'Computing 405', 2, 7, 8, 'blue'],
  ['College Physics', 'Prof. Li', 'Science A-105', 3, 1, 2, 'yellow'],
  ['Calculus A', 'Chen Ming', 'Science A-302', 3, 5, 6, 'sage'],
  ['College English', 'Lin Yue', 'Humanities B-201', 4, 3, 4, 'peach'],
  ['PE · Badminton', 'Zhang Fan', 'Sports Hall 2', 4, 7, 8, 'rose'],
  ['Python Programming', 'Wang Yu', 'Computing 405', 5, 1, 2, 'blue'],
  ['Design Thinking', 'Zhou Jia', 'Creative Studio 203', 5, 5, 6, 'lavender'],
].map(([name, teacher, room, day, start, end, color], i) => ({
  id: `demo-${i}`,
  name: String(name),
  teacher: String(teacher),
  room: String(room),
  day: Number(day),
  start: Number(start),
  end: Number(end),
  color: color as Color,
  weeks: allWeeks,
  note: '',
}));

export function parseWeeks(
  input: string,
  max = 30,
  locale: Locale = 'en',
): number[] {
  const t = createTranslator(locale);
  let source = input
    .trim()
    .replace(/\bodd\b/gi, '单')
    .replace(/\beven\b/gi, '双')
    .replace(/單/g, '单')
    .replace(/雙/g, '双')
    .replace(/週/g, '周')
    .replace(/[，、；;]/g, ',')
    .replace(/[～~—–至]/g, '-')
    .replace(/第|周|\s/g, '');
  const parity = /单/.test(source) ? 1 : /双/.test(source) ? 0 : null;
  if (/单/.test(source) && /双/.test(source))
    throw new Error(t('ui.chooseEitherOddOrEvenWeeks'));
  source = source.replace(/[单双()（）]/g, '');
  const numbers = new Set<number>();
  if (!source) throw new Error(t('ui.enterTeachingWeeksEG116'));
  for (const part of source.split(',')) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) throw new Error(t('ui.use116135Or116'));
    const from = Number(match[1]),
      to = Number(match[2] || match[1]);
    if (from < 1 || to > max || from > to)
      throw new Error(t('ui.weeksMustBeBetween1And', { 0: max }));
    for (let n = from; n <= to; n++)
      if (parity === null || n % 2 === parity) numbers.add(n);
  }
  if (!numbers.size) throw new Error(t('ui.noTeachingWeeksMatchThisSelection'));
  return [...numbers].sort((a, b) => a - b);
}
export function formatWeeks(weeks: number[]): string {
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const first = sorted[i];
    let last = first;
    while (i + 1 < sorted.length && sorted[i + 1] === last + 1)
      last = sorted[++i];
    ranges.push(first === last ? String(first) : `${first}-${last}`);
  }
  return ranges.join(',');
}
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dateAtWeek(settings: Settings, week: number, day = 1): Date {
  const date = new Date(`${settings.startDate}T12:00:00`);
  date.setDate(
    date.getDate() - ((date.getDay() + 6) % 7) + (week - 1) * 7 + day - 1,
  );
  return date;
}
export function weekElapsedPercent(
  settings: Settings,
  week: number,
  now: Date,
) {
  const monday = dateAtWeek(settings, week);
  monday.setHours(0, 0, 0, 0);
  const start = Math.max(+monday, +new Date(`${settings.startDate}T00:00:00`));
  const end = new Date(monday);
  end.setDate(end.getDate() + 7);
  return Math.max(
    0,
    Math.min(100, Math.floor(((+now - start) / (+end - start)) * 100)),
  );
}
export function currentWeek(settings: Settings, now = new Date()): number {
  if (localDate(now) < settings.startDate) return 0;
  const start = dateAtWeek(settings, 1);
  start.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return (
    Math.floor(Math.round((today.getTime() - start.getTime()) / 86400000) / 7) +
    1
  );
}
export function courseOccursInWeek(
  course: Course,
  settings: Settings,
  week: number,
): boolean {
  return (
    week >= 1 &&
    week <= settings.totalWeeks &&
    course.weeks.includes(week) &&
    localDate(dateAtWeek(settings, week, course.day)) >= settings.startDate
  );
}
export function parseCourseTiming(
  startInput: string,
  endInput: string,
  locale: Locale = 'en',
  maxPeriods = DEFAULT_SETTINGS.periods.length,
): Required<CourseTiming> {
  const t = createTranslator(locale);
  const start = startInput.trim(),
    end = endInput.trim();
  if (/^\d+$/.test(start) && /^\d+$/.test(end)) {
    const first = Number(start),
      last = Number(end);
    if (first < 1 || last > maxPeriods || first > last)
      throw new Error(t('timing.periodRangeError', { 0: maxPeriods }));
    return { timing: 'period', start: first, end: last };
  }
  const clock = /^(?:[01]?\d|2[0-3]):[0-5]\d$/;
  if (clock.test(start) && clock.test(end)) {
    const first = start.padStart(5, '0'),
      last = end.padStart(5, '0');
    if (first >= last) throw new Error(t('timing.endAfterStart'));
    return { timing: 'time', start: first, end: last };
  }
  throw new Error(t('timing.invalidPair', { 0: maxPeriods }));
}
export function courseClock(
  course: Course,
  settings: Settings = DEFAULT_SETTINGS,
) {
  return course.timing === 'time'
    ? { start: course.start, end: course.end }
    : {
        start: settings.periods[course.start - 1]?.start || '',
        end: settings.periods[course.end - 1]?.end || '',
      };
}
export function compareCourses(a: Course, b: Course, settings: Settings) {
  if (a.day !== b.day) return a.day - b.day;
  const first = courseClock(a, settings).start,
    second = courseClock(b, settings).start;
  if (first && second) return first.localeCompare(second);
  if (isPeriodCourse(a) && isPeriodCourse(b)) return a.start - b.start;
  return Number(isPeriodCourse(a)) - Number(isPeriodCourse(b));
}
export function courseOverlap(
  course: Course,
  other: Course,
  settings?: Settings,
): boolean | undefined {
  if (
    course.id === other.id ||
    course.day !== other.day ||
    !other.weeks.some(
      (week) =>
        course.weeks.includes(week) &&
        (!settings || courseOccursInWeek(course, settings, week)),
    )
  )
    return false;
  if (isPeriodCourse(course) && isPeriodCourse(other))
    return other.start <= course.end && other.end >= course.start;
  const a = courseClock(course, settings),
    b = courseClock(other, settings);
  if (!a.start || !a.end || !b.start || !b.end) return undefined;
  return a.start < b.end && b.start < a.end;
}
export function conflicts(
  course: Course,
  courses: Course[],
  settings?: Settings,
): Course[] {
  return courses.filter(
    (other) => courseOverlap(course, other, settings) === true,
  );
}
export function unresolvedConflicts(
  course: Course,
  courses: Course[],
  settings?: Settings,
): Course[] {
  return courses.filter(
    (other) => courseOverlap(course, other, settings) === undefined,
  );
}
export function validateCourse(
  course: Course,
  totalWeeks = 30,
  locale: Locale = 'en',
  maxPeriods = DEFAULT_SETTINGS.periods.length,
): void {
  const t = createTranslator(locale);
  if (!course.name?.trim() || course.name.length > 100)
    throw new Error(t('ui.enterACourseNameOfNoMoreThan100'));
  if (!Number.isInteger(course.day) || course.day < 1 || course.day > 7)
    throw new Error(t('ui.dayMustBeBetween1MondayAnd7Sunday'));
  if (course.timing === 'time') {
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(course.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(course.end) ||
      course.start >= course.end
    )
      throw new Error(t('timing.invalidPair', { 0: maxPeriods }));
  } else if (
    (course.timing !== undefined && course.timing !== 'period') ||
    ![course.start, course.end].every(Number.isInteger) ||
    course.start < 1 ||
    course.end > maxPeriods ||
    course.start > course.end
  ) {
    throw new Error(t('timing.periodRangeError', { 0: maxPeriods }));
  }
  if (
    !Array.isArray(course.weeks) ||
    !course.weeks.length ||
    course.weeks.some((w) => !Number.isInteger(w) || w < 1 || w > totalWeeks)
  )
    throw new Error(t('ui.weeksMustBeBetween1And', { 0: totalWeeks }));
  if (!COLORS.includes(course.color))
    throw new Error(t('ui.invalidCourseColor'));
  if ('hidden' in course && typeof course.hidden !== 'boolean')
    throw new Error(t('ui.invalidCourseDetails'));
  if (
    [course.teacher, course.room, course.note].some(
      (v) => typeof v !== 'string',
    )
  )
    throw new Error(t('ui.invalidCourseDetails'));
}
export function validateSettings(
  settings: Settings,
  locale: Locale = 'en',
): void {
  const t = createTranslator(locale);
  if (!settings.semester?.trim()) throw new Error(t('ui.enterASemesterName'));
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(settings.startDate) ||
    Number.isNaN(new Date(settings.startDate + 'T12:00:00').getTime()) ||
    localDate(new Date(settings.startDate + 'T12:00:00')) !== settings.startDate
  )
    throw new Error(t('settings.invalidStartDate'));
  if (
    !Number.isInteger(settings.totalWeeks) ||
    settings.totalWeeks < 1 ||
    settings.totalWeeks > 30
  )
    throw new Error(t('ui.semesterLengthMustBeBetween1And30Weeks'));
  if (
    !Array.isArray(settings.periods) ||
    settings.periods.length < 1 ||
    settings.periods.length > MAX_PERIODS
  )
    throw new Error(t('settings.invalidPeriodCount', { 0: MAX_PERIODS }));
  let last = '';
  for (const period of settings.periods) {
    if (
      !period ||
      [period.start, period.end].some(
        (value) =>
          typeof value !== 'string' ||
          (value !== '' && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)),
      )
    )
      throw new Error(t('settings.invalidTime'));
    if (period.start && period.end && period.start >= period.end)
      throw new Error(t('ui.classTimesMustBeInChronologicalOrderAndCannot'));
    for (const value of [period.start, period.end]) {
      if (!value) continue;
      if (last && value < last)
        throw new Error(t('ui.classTimesMustBeInChronologicalOrderAndCannot'));
      last = value;
    }
  }
}
export function decodeSaved(raw: string, locale: Locale = 'en'): SavedData {
  const t = createTranslator(locale);
  const data = JSON.parse(raw) as SavedData;
  if (
    data.version !== 1 ||
    !Array.isArray(data.courses) ||
    typeof data.isDemo !== 'boolean'
  )
    throw new Error(t('ui.unsupportedDataFormat'));
  validateSettings(data.settings, locale);
  const ids = new Set<string>();
  for (const course of data.courses) {
    validateCourse(
      course,
      data.settings.totalWeeks,
      locale,
      data.settings.periods.length,
    );
    if (typeof course.id !== 'string' || !course.id || ids.has(course.id))
      throw new Error(t('ui.courseIdsAreMissingOrDuplicated'));
    ids.add(course.id);
  }
  return data;
}
