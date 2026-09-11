import { createTranslator, type Locale } from './i18n';
export const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const COLORS = [
  'sage',
  'peach',
  'lavender',
  'blue',
  'yellow',
  'rose',
] as const;
export type Color = (typeof COLORS)[number];
export type Course = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  day: number;
  start: number;
  end: number;
  weeks: number[];
  color: Color;
  note: string;
};
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
export const DEFAULT_SETTINGS: Settings = {
  semester: '2026 — 2027 · 秋季学期',
  startDate: '2026-09-07',
  totalWeeks: 20,
  periods: [
    ['08:00', '08:45'],
    ['08:55', '09:40'],
    ['10:00', '10:45'],
    ['10:55', '11:40'],
    ['14:00', '14:45'],
    ['14:55', '15:40'],
    ['16:00', '16:45'],
    ['16:55', '17:40'],
    ['19:00', '19:45'],
    ['19:55', '20:40'],
    ['20:50', '21:35'],
    ['21:45', '22:30'],
  ].map(([start, end]) => ({ start, end })),
};
const allWeeks = Array.from({ length: 16 }, (_, i) => i + 1);
export const SAMPLE_COURSES: Course[] = [
  ['高等数学 A', '陈明', '理科楼 A-302', 1, 1, 2, 'sage'],
  ['大学英语', '林悦', '文科楼 B-201', 1, 5, 6, 'peach'],
  ['设计思维与创新', '周嘉', '创意工坊 203', 2, 3, 4, 'lavender'],
  ['Python 程序设计', '王宇', '信息楼 405', 2, 7, 8, 'blue'],
  ['大学物理', '李教授', '理科楼 A-105', 3, 1, 2, 'yellow'],
  ['高等数学 A', '陈明', '理科楼 A-302', 3, 5, 6, 'sage'],
  ['大学英语', '林悦', '文科楼 B-201', 4, 3, 4, 'peach'],
  ['体育 · 羽毛球', '张帆', '体育馆 2 号馆', 4, 7, 8, 'rose'],
  ['Python 程序设计', '王宇', '信息楼 405', 5, 1, 2, 'blue'],
  ['设计思维与创新', '周嘉', '创意工坊 203', 5, 5, 6, 'lavender'],
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
  locale: Locale = 'zh-CN',
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
    throw new Error(t('请分别填写单周或双周'));
  source = source.replace(/[单双()（）]/g, '');
  const numbers = new Set<number>();
  if (!source) throw new Error(t('请填写上课周次，例如 1-16'));
  for (const part of source.split(',')) {
    const match = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!match) throw new Error(t('周次格式应为 1-16、1,3,5 或 1-16(单)'));
    const from = Number(match[1]),
      to = Number(match[2] || match[1]);
    if (from < 1 || to > max || from > to)
      throw new Error(t('周次应在 1-{0} 之间', { 0: max }));
    for (let n = from; n <= to; n++)
      if (parity === null || n % 2 === parity) numbers.add(n);
  }
  if (!numbers.size) throw new Error(t('所选周次中没有符合条件的上课周'));
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
  date.setDate(date.getDate() + (week - 1) * 7 + day - 1);
  return date;
}
export function currentWeek(settings: Settings, now = new Date()): number {
  const start = new Date(`${settings.startDate}T00:00:00`);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return (
    Math.floor(Math.round((today.getTime() - start.getTime()) / 86400000) / 7) +
    1
  );
}
export function conflicts(course: Course, courses: Course[]): Course[] {
  return courses.filter(
    (other) =>
      other.id !== course.id &&
      other.day === course.day &&
      other.start <= course.end &&
      other.end >= course.start &&
      other.weeks.some((w) => course.weeks.includes(w)),
  );
}
export function validateCourse(
  course: Course,
  totalWeeks = 30,
  locale: Locale = 'zh-CN',
): void {
  const t = createTranslator(locale);
  if (!course.name?.trim() || course.name.length > 100)
    throw new Error(t('课程名称必填，且不能超过 100 字'));
  if (!Number.isInteger(course.day) || course.day < 1 || course.day > 7)
    throw new Error(t('星期应在 1-7 之间'));
  if (
    ![course.start, course.end].every(Number.isInteger) ||
    course.start < 1 ||
    course.end > 12 ||
    course.start > course.end
  )
    throw new Error(t('节次应在 1-12 之间，结束节次不能早于开始节次'));
  if (
    !Array.isArray(course.weeks) ||
    !course.weeks.length ||
    course.weeks.some((w) => !Number.isInteger(w) || w < 1 || w > totalWeeks)
  )
    throw new Error(t('周次应在 1-{0} 之间', { 0: totalWeeks }));
  if (!COLORS.includes(course.color)) throw new Error(t('无效的课程颜色'));
  if (
    [course.teacher, course.room, course.note].some(
      (v) => typeof v !== 'string',
    )
  )
    throw new Error(t('无效的课程信息'));
}
export function validateSettings(
  settings: Settings,
  locale: Locale = 'zh-CN',
): void {
  const t = createTranslator(locale);
  if (!settings.semester?.trim()) throw new Error(t('请输入学期名称'));
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(settings.startDate) ||
    Number.isNaN(new Date(settings.startDate + 'T12:00:00').getTime()) ||
    localDate(new Date(settings.startDate + 'T12:00:00')) !==
      settings.startDate ||
    new Date(settings.startDate + 'T12:00:00').getDay() !== 1
  )
    throw new Error(t('开学日期请选择第一周的周一'));
  if (
    !Number.isInteger(settings.totalWeeks) ||
    settings.totalWeeks < 1 ||
    settings.totalWeeks > 30
  )
    throw new Error(t('学期长度应在 1-30 周之间'));
  if (!Array.isArray(settings.periods) || settings.periods.length !== 12)
    throw new Error(t('请设置 12 节课的时间'));
  let last = '00:00';
  for (const period of settings.periods) {
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(period.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(period.end) ||
      period.start >= period.end ||
      period.start < last
    )
      throw new Error(t('上课时间需按先后排列，且不能重叠'));
    last = period.end;
  }
}
export function decodeSaved(raw: string, locale: Locale = 'zh-CN'): SavedData {
  const t = createTranslator(locale);
  const data = JSON.parse(raw) as SavedData;
  if (
    data.version !== 1 ||
    !Array.isArray(data.courses) ||
    typeof data.isDemo !== 'boolean'
  )
    throw new Error(t('不支持的数据格式'));
  validateSettings(data.settings, locale);
  const ids = new Set<string>();
  for (const course of data.courses) {
    validateCourse(course, data.settings.totalWeeks, locale);
    if (typeof course.id !== 'string' || !course.id || ids.has(course.id))
      throw new Error(t('课程编号重复或缺失'));
    ids.add(course.id);
  }
  return data;
}
