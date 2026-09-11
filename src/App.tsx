import { useI18n } from './LocaleProvider';
import { createTranslator, LOCALES, LOCALE_NAMES, type Locale } from './i18n';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
  LayoutGrid,
  List,
  LoaderCircle,
  MapPin,
  Menu,
  Monitor,
  Moon,
  Sun,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  COLORS,
  DEFAULT_SETTINGS,
  SAMPLE_COURSES,
  conflicts,
  currentWeek,
  dateAtWeek,
  decodeSaved,
  formatWeeks,
  localDate,
  parseWeeks,
  validateCourse,
  validateSettings,
  type Course,
  type SavedData,
  type Settings,
} from './schedule';
import type { ImportResult } from './importer';
import { useTheme } from './useTheme';

const STORAGE_KEY = 'moving-on-schedule.v1';
const COLOR_NAMES = [
  '鼠尾草绿',
  '杏桃色',
  '淡紫色',
  '晴空蓝',
  '奶油黄',
  '玫瑰粉',
];
function loadData(): { data: SavedData; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { data: decodeSaved(raw), error: '' };
  } catch {
    return {
      data: {
        version: 1,
        courses: [],
        settings: DEFAULT_SETTINGS,
        isDemo: false,
      },
      error:
        '无法读取本地课表，原始数据未被覆盖。请先备份浏览器数据，再进行修改。',
    };
  }
  return {
    data: {
      version: 1,
      courses: SAMPLE_COURSES,
      settings: DEFAULT_SETTINGS,
      isDemo: true,
    },
    error: '',
  };
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusables = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        ) || [],
      );
    focusables()[0]?.focus();
    function keyboard(e: KeyboardEvent) {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const all = focusables(),
          first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', keyboard);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', keyboard);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">MOVING-ON SCHEDULE</span>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label={t('关闭弹窗')}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function CourseForm({
  course,
  day,
  totalWeeks,
  courses,
  onSave,
  onDelete,
  onClose,
}: {
  course?: Course;
  day?: number;
  totalWeeks: number;
  courses: Course[];
  onSave: (course: Course) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const { t, locale, days: DAYS } = useI18n();
  const [draft, setDraft] = useState<Course>(
    course || {
      id: crypto.randomUUID(),
      name: '',
      teacher: '',
      room: '',
      day: day || 1,
      start: 1,
      end: 2,
      weeks: [],
      color: 'blue',
      note: '',
    },
  );
  const [weeks, setWeeks] = useState(
    course ? formatWeeks(course.weeks) : `1-${totalWeeks}`,
  );
  const [error, setError] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false);
  const isEditing = Boolean(course && courses.some((c) => c.id === course.id));
  const update = (key: keyof Course, value: unknown) =>
    setDraft({ ...draft, [key]: value });
  let collision: Course[] = [];
  try {
    collision = conflicts(
      { ...draft, weeks: parseWeeks(weeks, totalWeeks, locale) },
      courses,
    );
  } catch {
    /* Inline validation appears on submit. */
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const next = {
        ...draft,
        name: draft.name.trim(),
        room: draft.room.trim(),
        teacher: draft.teacher.trim(),
        weeks: parseWeeks(weeks, totalWeeks, locale),
      };
      validateCourse(next, totalWeeks, locale);
      onSave(next);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('请检查课程信息'));
    }
  }
  return (
    <Modal
      title={isEditing ? t('编辑课程') : t('添加一门课程')}
      subtitle={t('叮！把课程安排收进小本本。')}
      onClose={onClose}
    >
      <form onSubmit={submit} className="course-form" noValidate>
        <label>
          <span>{t('课程名称 *')}</span>
          <input
            required
            maxLength={100}
            placeholder={t('例如：设计思维与创新')}
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            {t('上课地点')}
            <input
              maxLength={100}
              placeholder={t('教学楼 / 教室 / 线上会议')}
              value={draft.room}
              onChange={(e) => update('room', e.target.value)}
            />
          </label>
          <label>
            {t('授课教师')}
            <input
              maxLength={100}
              placeholder={t('教师姓名（选填）')}
              value={draft.teacher}
              onChange={(e) => update('teacher', e.target.value)}
            />
          </label>
        </div>
        <div className="form-grid thirds">
          <label>
            {t('星期')}
            <select
              value={draft.day}
              onChange={(e) => update('day', Number(e.target.value))}
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('开始节次')}
            <select
              value={draft.start}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  start: Number(e.target.value),
                  end: Math.max(draft.end, Number(e.target.value)),
                })
              }
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {t('第 {0} 节', { 0: i + 1 })}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t('结束节次')}
            <select
              value={draft.end}
              onChange={(e) => update('end', Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option disabled={i + 1 < draft.start} key={i} value={i + 1}>
                  {t('第 {0} 节', { 0: i + 1 })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span>{t('上课周次 *')}</span>
          <input
            required
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            placeholder={t('1-16 / 1,3,5 / 1-16(单)')}
          />
          <small>{t('支持连续周、指定周和单双周，例如 1-16(单)。')}</small>
        </label>
        <fieldset className="color-field">
          <legend>{t('课程颜色')}</legend>
          <div className="color-options">
            {COLORS.map((color, i) => (
              <button
                key={color}
                type="button"
                aria-label={t(COLOR_NAMES[i])}
                aria-pressed={draft.color === color}
                className={`color-swatch ${color} ${draft.color === color ? 'selected' : ''}`}
                onClick={() => update('color', color)}
              >
                {draft.color === color && <Check size={17} />}
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          {t('备注')}
          <textarea
            maxLength={500}
            rows={2}
            placeholder={t('教材、课程链接，或给自己的小提醒…')}
            value={draft.note}
            onChange={(e) => update('note', e.target.value)}
          />
        </label>
        {collision.length > 0 && (
          <div className="notice warning">
            {t('与「{0} 」存在时间重叠。保存后会并排展示，请确认安排。', {
              0: collision
                .map((c) => c.name)
                .join(locale === 'en' ? ', ' : '、'),
            })}
          </div>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {isEditing && course && (
            <button
              className="text-button danger"
              type="button"
              onClick={() => {
                if (confirmDelete) onDelete(course.id);
                else setConfirmDelete(true);
              }}
            >
              <Trash2 size={16} />
              {confirmDelete ? t('确认删除此课程') : t('删除课程')}
            </button>
          )}
          <div className="action-spacer" />
          <button className="button secondary" type="button" onClick={onClose}>
            {t('取消')}
          </button>
          <button className="button primary" type="submit">
            <Check size={16} />
            {isEditing ? t('保存修改') : t('添加课程')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ImportModal({
  totalWeeks,
  isDemo,
  existing,
  onApply,
  onClose,
  notify,
}: {
  totalWeeks: number;
  isDemo: boolean;
  existing: Course[];
  onApply: (courses: Course[], replace: boolean) => void;
  onClose: () => void;
  notify: (text: string) => void;
}) {
  const { t, locale, days: DAYS } = useI18n();
  const [result, setResult] = useState<ImportResult | null>(null),
    [fileName, setFileName] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [replace, setReplace] = useState(isDemo),
    [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function select(file?: File) {
    if (!file) return;
    const token = ++generation.current;
    setBusy(true);
    setError('');
    setResult(null);
    setFileName(file.name);
    try {
      const importer = await import('./importer');
      const parsed = await importer.readImport(file, totalWeeks, locale);
      if (token === generation.current) setResult(parsed);
    } catch (error) {
      if (token === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : t('文件读取失败，请检查 Excel 文件格式'),
        );
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  const overlap =
    result?.courses.filter(
      (c, i) =>
        conflicts(c, [
          ...(replace ? [] : existing),
          ...result.courses.slice(0, i),
        ]).length,
    ).length || 0;
  async function template() {
    try {
      await (await import('./importer')).downloadWorkbook(undefined, locale);
      notify(t('Excel 模板已下载'));
    } catch {
      setError(t('模板下载失败，请重试'));
    }
  }
  return (
    <Modal
      title={t('导入你的课程表')}
      subtitle={t('把课程装进行囊，新学期准备出发！')}
      onClose={onClose}
      wide
    >
      <div className="import-steps">
        <span className={!result ? 'active' : 'done'}>
          <b>{result ? <Check size={12} /> : 1}</b>
          {t('选择文件')}
        </span>
        <i />
        <span className={result ? 'active' : ''}>
          <b>2</b>
          {t('预览并导入')}
        </span>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept=".xlsx,.csv"
        aria-label={t('选择课程表文件')}
        onChange={(e) => {
          void select(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        disabled={busy}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) void select(e.dataTransfer.files[0]);
        }}
      >
        {busy ? (
          <LoaderCircle className="spin" size={30} />
        ) : (
          <FileSpreadsheet size={32} />
        )}
        <strong>
          {busy ? t('正在读取课表…') : fileName || t('将 Excel 文件拖到这里')}
        </strong>
        <span>
          {fileName ? t('点击重新选择文件') : t('或点击选择文件')}{' '}
          <ArrowUpRight size={13} />
        </span>
        <small>{t('支持 .xlsx、UTF-8 .csv · 最大 10 MB')}</small>
      </button>
      <div className="template-row">
        <div>
          <strong>{t('还没有合适的表格？')}</strong>
          <p>{t('下载模板，填写课程信息后再导入。')}</p>
        </div>
        <button className="text-button" onClick={template}>
          <ArrowDownToLine size={16} />
          {t('下载 Excel 模板')}
        </button>
      </div>
      <details className="format-help">
        <summary>{t('查看格式说明')}</summary>
        <p>
          {t(
            '第一行是表头： {0} 为必需列；教室、教师、备注为选填。每行是一段上课安排，同一课程多个时间请分行填写。读取第一个非空工作表，导入前会展示工作表名称。',
            {
              0: (locale === 'en'
                ? ['name', 'day', 'start', 'end', 'weeks']
                : ['课程名称', '星期', '开始节次', '结束节次', '周次'].map(
                    (tKey) => t(tKey),
                  )
              ).join(locale === 'en' ? ', ' : '、'),
            },
          )}
        </p>
        <p>
          {t(
            '星期：周一至周日或 1–7；节次：1–12；周次：1-16、1,3,5 或 1-16(单)。旧版 .xls 请先另存为 .xlsx。暂不识别合并单元格的周视图课表。',
          )}
        </p>
      </details>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="import-preview">
          <div className="preview-heading">
            <strong>
              {t('识别到 {0} 条课程', { 0: result.courses.length })}
            </strong>
            <small>
              {t('工作表：{0} · 共 {1} 行', {
                0: result.sheet,
                1: result.rows,
              })}
            </small>
          </div>
          {result.errors.length > 0 && (
            <div className="notice error" role="alert">
              <strong>
                {t('请修正以下问题后重新上传，当前文件尚未导入。')}
              </strong>
              <ul>
                {result.errors.slice(0, 12).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              {result.errors.length > 12 && (
                <span>
                  {t('另有 {0} 处错误。', { 0: result.errors.length - 12 })}
                </span>
              )}
            </div>
          )}
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>{t('课程名称')}</th>
                  <th>{t('时间')}</th>
                  <th>{t('周次')}</th>
                  <th>{t('教室')}</th>
                </tr>
              </thead>
              <tbody>
                {result.courses.slice(0, 50).map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      {t('{0} · {1}–{2} 节', {
                        0: DAYS[c.day - 1],
                        1: c.start,
                        2: c.end,
                      })}
                    </td>
                    <td>{formatWeeks(c.weeks)}</td>
                    <td>{c.room || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.courses.length > 50 && (
            <small>
              {t('仅预览前 50 条，确认后导入全部 {0} 条。', {
                0: result.courses.length,
              })}
            </small>
          )}
          <label className="check-label">
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            {isDemo ? t('替换示例课表') : t('替换当前全部课程')}
            <small>
              {replace
                ? t('将移除现有 {0} 条安排', { 0: existing.length })
                : t('课程将追加到现有课表')}
            </small>
          </label>
          {overlap > 0 && (
            <div className="notice warning">
              {t('有 {0} 条课程与其他安排重叠，导入后会并排展示。', {
                0: overlap,
              })}
            </div>
          )}
        </div>
      )}
      <div className="modal-actions">
        <span className="privacy-note">
          <ShieldCheck size={14} />
          {t('文件仅在本机处理')}
        </span>
        <div className="action-spacer" />
        <button className="button secondary" onClick={onClose}>
          {t('取消')}
        </button>
        <button
          className="button primary"
          disabled={
            !result ||
            result.errors.length > 0 ||
            busy ||
            !result.courses.length
          }
          onClick={() => result && onApply(result.courses, replace)}
        >
          <Check size={16} />
          {result
            ? t('确认导入 {0} 条', { 0: result.courses.length })
            : t('确认导入')}
        </button>
      </div>
    </Modal>
  );
}
function SettingsModal({
  settings,
  courses,
  onSave,
  onClose,
}: {
  settings: Settings;
  courses: Course[];
  onSave: (settings: Settings) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState<Settings>({
      ...structuredClone(settings),
      semester:
        settings.semester === DEFAULT_SETTINGS.semester
          ? t(settings.semester)
          : settings.semester,
    }),
    [error, setError] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      validateSettings(draft, locale);
      if (courses.some((c) => c.weeks.some((w) => w > draft.totalWeeks)))
        throw new Error(t('现有课程超出了新学期长度，请先调整课程周次'));
      onSave(draft);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('请检查设置'));
    }
  }
  return (
    <Modal
      title={t('课表设置')}
      subtitle={t('调好校园时钟，开启专属日常。')}
      onClose={onClose}
    >
      <form onSubmit={submit} className="course-form" noValidate>
        <label>
          {t('学期名称')}
          <input
            required
            maxLength={60}
            value={draft.semester}
            onChange={(e) => setDraft({ ...draft, semester: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            {t('第一周的周一')}
            <input
              type="date"
              required
              value={draft.startDate}
              onChange={(e) =>
                setDraft({ ...draft, startDate: e.target.value })
              }
            />
          </label>
          <label>
            {t('学期总周数')}
            <input
              type="number"
              min={1}
              max={30}
              required
              value={draft.totalWeeks}
              onChange={(e) =>
                setDraft({ ...draft, totalWeeks: Number(e.target.value) })
              }
            />
          </label>
        </div>
        <div className="period-settings">
          <strong>{t('每日作息')}</strong>
          <p>{t('修改后，课表与即将开始的课程会同步更新。')}</p>
          <div>
            {draft.periods.map((p, i) => (
              <div className="period-setting" key={i}>
                <span>{t('第 {0} 节', { 0: i + 1 })}</span>
                <input
                  aria-label={t('第 {0} 节开始时间', { 0: i + 1 })}
                  type="time"
                  required
                  value={p.start}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      periods: draft.periods.map((v, j) =>
                        j === i ? { ...v, start: e.target.value } : v,
                      ),
                    })
                  }
                />
                <span>—</span>
                <input
                  aria-label={t('第 {0} 节结束时间', { 0: i + 1 })}
                  type="time"
                  required
                  value={p.end}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      periods: draft.periods.map((v, j) =>
                        j === i ? { ...v, end: e.target.value } : v,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <div className="action-spacer" />
          <button className="button secondary" type="button" onClick={onClose}>
            {t('取消')}
          </button>
          <button className="button primary" type="submit">
            {t('保存设置')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MiniCalendar({
  settings,
  week,
  setWeek,
}: {
  settings: Settings;
  week: number;
  setWeek: (week: number) => void;
}) {
  const { t, days: DAYS, narrowDays, date: formatDate } = useI18n();
  const selected = dateAtWeek(settings, week),
    month = selected.getMonth(),
    year = selected.getFullYear();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7,
    days = new Date(year, month + 1, 0).getDate();
  const today = localDate(new Date());
  return (
    <div className="mini-calendar">
      <div className="mini-month">
        <span>{formatDate(selected, { year: 'numeric', month: 'long' })}</span>
        <CalendarDays size={15} />
      </div>
      <div className="mini-grid">
        {DAYS.map((day) => (
          <span className="mini-day" key={day}>
            {narrowDays[DAYS.indexOf(day)]}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = new Date(year, month, i + 1),
            w = currentWeek(settings, date);
          return (
            <button
              key={i}
              className={`${w === week ? 'in-week' : ''} ${localDate(date) === today ? 'is-today' : ''}`}
              disabled={w < 1 || w > settings.totalWeeks}
              aria-label={t('{0}，第 {1} 周', {
                0: formatDate(date, { month: 'long', day: 'numeric' }),
                1: w,
              })}
              onClick={() => setWeek(w)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function CourseCard({
  course,
  onClick,
  compact = false,
}: {
  course: Course;
  onClick: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <button
      className={`course-card ${course.color} ${compact ? 'compact' : ''}`}
      onClick={onClick}
      title={t('{0} · {1} · {2}-{3} 节', {
        0: course.name,
        1: course.room,
        2: course.start,
        3: course.end,
      })}
    >
      <span className="course-card-top">
        <span className="course-dot" />
        <span>{t('{0}–{1} 节', { 0: course.start, 1: course.end })}</span>
        <ArrowUpRight size={12} />
      </span>
      <strong>{course.name}</strong>
      {!compact && (
        <span className="course-room">
          <MapPin size={12} />
          {course.room || t('地点待定')}
        </span>
      )}
      {!compact && (
        <span className="course-teacher">
          {course.teacher || t('教师待定')}
        </span>
      )}
    </button>
  );
}

export default function App() {
  const { t, locale, days: DAYS, date: formatDate, chooseLocale } = useI18n();
  const { preference, chooseTheme } = useTheme();
  const [initial] = useState(loadData),
    [data, setData] = useState(initial.data),
    [storageError, setStorageError] = useState(initial.error),
    [changed, setChanged] = useState(false);
  const { courses: storedCourses, settings, isDemo } = data;
  const courses = useMemo(
    () =>
      isDemo
        ? storedCourses.map((course) => ({
            ...course,
            name: t(course.name),
            teacher: t(course.teacher),
            room: t(course.room),
          }))
        : storedCourses,
    [storedCourses, isDemo, t],
  );
  const semesterName =
    settings.semester === DEFAULT_SETTINGS.semester
      ? t(settings.semester)
      : settings.semester;
  const [week, setWeek] = useState(() =>
    Math.max(
      1,
      Math.min(
        currentWeek(initial.data.settings),
        initial.data.settings.totalWeeks,
      ),
    ),
  );
  const [page, setPage] = useState<'schedule' | 'courses'>('schedule'),
    [view, setView] = useState<'week' | 'list'>('week'),
    [showWeekend, setShowWeekend] = useState(true),
    [query, setQuery] = useState(''),
    [modal, setModal] = useState<
      'course' | 'import' | 'settings' | 'help' | 'blank' | null
    >(null),
    [editing, setEditing] = useState<Course | undefined>(),
    [newDay, setNewDay] = useState<number | undefined>(),
    [toast, setToast] = useState(''),
    [mobileNav, setMobileNav] = useState(false),
    [now, setNow] = useState(new Date());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => {
      clearInterval(id);
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!changed) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError('');
    } catch {
      setStorageError(
        t(
          '本地保存失败，可能是存储空间已满。请导出 Excel 备份，关闭页面会丢失本次修改。',
        ),
      );
    }
  }, [data, changed]);
  function notify(text: string) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }
  function update(next: SavedData) {
    setData(next);
    setChanged(true);
  }
  function add(day?: number) {
    setEditing(undefined);
    setNewDay(day);
    setModal('course');
  }
  function edit(course: Course) {
    setEditing(course);
    setModal('course');
  }
  function save(course: Course) {
    update({
      ...data,
      isDemo: false,
      courses: editing
        ? courses.map((c) => (c.id === course.id ? course : c))
        : [...courses, course],
    });
    setModal(null);
    notify(
      editing
        ? t('课程修改已保存，安排妥当啦')
        : t('新课程已添加，课程小队 +1！'),
    );
  }
  function remove(id: string) {
    update({
      ...data,
      isDemo: false,
      courses: courses.filter((c) => c.id !== id),
    });
    setModal(null);
    notify(t('课程已删除'));
  }
  const matches = (course: Course) =>
    `${course.name} ${course.teacher} ${course.room}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  const weekCourses = courses.filter((c) => c.weeks.includes(week));
  const filtered = weekCourses.filter(matches),
    allFiltered = courses.filter(matches);
  const days = showWeekend ? DAYS : DAYS.slice(0, 5);
  const uniqueCourses = new Set(weekCourses.map((c) => c.name)).size,
    lessons = weekCourses.reduce((sum, c) => sum + c.end - c.start + 1, 0),
    freeDays = 7 - new Set(weekCourses.map((c) => c.day)).size;
  const selectedStart = dateAtWeek(settings, week),
    selectedEnd = dateAtWeek(settings, week, 7),
    actualWeek = currentWeek(settings, now);
  const upcoming = useMemo(() => {
    const entries: { course: Course; date: Date; week: number }[] = [];
    for (
      let w = Math.max(1, currentWeek(settings, now));
      w <= settings.totalWeeks;
      w++
    ) {
      for (const c of courses.filter((c) => c.weeks.includes(w))) {
        const date = dateAtWeek(settings, w, c.day);
        const [hour, minute] = settings.periods[c.start - 1].start
          .split(':')
          .map(Number);
        date.setHours(hour, minute, 0, 0);
        if (date >= now) entries.push({ course: c, date, week: w });
      }
      if (entries.length >= 3) break;
    }
    return entries
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 3);
  }, [courses, settings, now]);
  const weekPassed = Math.max(
    0,
    Math.min(
      100,
      ((now.getTime() - dateAtWeek(settings, week).setHours(0, 0, 0, 0)) /
        (7 * 86400000)) *
        100,
    ),
  );
  async function exportCourses() {
    try {
      await (await import('./importer')).downloadWorkbook(courses, locale);
      notify(t('课程表已导出为 Excel'));
    } catch {
      notify(t('导出失败，请重试'));
    }
  }
  return (
    <div className="app-shell">
      {mobileNav && (
        <div className="nav-scrim" onClick={() => setMobileNav(false)} />
      )}
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <a
          className="brand"
          href="#"
          aria-label={t('Moving-on Schedule 首页')}
          onClick={(e) => {
            e.preventDefault();
            setPage('schedule');
            setMobileNav(false);
          }}
        >
          <span className="brand-mark">
            <svg viewBox="0 0 32 32" aria-hidden="true">
              <path d="M5 24V9l11 11V5h11v19" />
            </svg>
          </span>
          <span>
            Moving-on<small>SCHEDULE</small>
          </span>
        </a>
        <div className="sidebar-term">
          <span className="term-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <strong>{t('我的校园物语')}</strong>
            <span>{semesterName.split('·').pop()?.trim()}</span>
          </div>
          <button
            className="icon-button"
            aria-label={t('编辑学期')}
            onClick={() => setModal('settings')}
          >
            <ChevronDown size={15} />
          </button>
        </div>
        <span className="nav-label">{t('课表小天地')}</span>
        <nav>
          <button
            className={page === 'schedule' ? 'active' : ''}
            onClick={() => {
              setPage('schedule');
              setMobileNav(false);
            }}
          >
            <CalendarDays size={19} />
            {t('我的课表')}
            <span className="nav-indicator" />
          </button>
          <button
            className={page === 'courses' ? 'active' : ''}
            onClick={() => {
              setPage('courses');
              setMobileNav(false);
            }}
          >
            <BookOpen size={19} />
            {t('全部课程')}
            <span className="nav-count">
              {new Set(courses.map((c) => c.name)).size}
            </span>
          </button>
          <button onClick={() => setModal('import')}>
            <Upload size={19} />
            {t('导入课表')}
            <ArrowUpRight className="nav-arrow" size={14} />
          </button>
        </nav>
        <div className="sidebar-rule" />
        <MiniCalendar
          settings={settings}
          week={week}
          setWeek={(w) => {
            setWeek(w);
            setPage('schedule');
          }}
        />
        <div className="sidebar-grow" />
        <div className="sidebar-note">
          <Sparkles className="little-star" size={23} aria-hidden="true" />
          <p>
            {t('今天的努力，')}
            <br />
            {t('明天会发光。')}
          </p>
          <span>A LITTLE MAGIC, EVERY DAY.</span>
          <div className="note-orbit" />
        </div>
        <div className="bottom-nav">
          <button onClick={() => setModal('settings')}>
            <Settings2 size={18} />
            {t('课表设置')}
          </button>
          <button onClick={() => setModal('help')}>
            <HelpCircle size={18} />
            {t('使用指南')}
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div className="local-status">
          <span />
          {t('仅存储在此浏览器')}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={t('打开导航')}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <span>{t('课表小天地')}</span>
            <ChevronRight size={13} />
            <strong>
              {page === 'schedule' ? t('我的课表') : t('全部课程')}
            </strong>
          </div>
          <div className="topbar-right">
            <select
              className="language-select"
              aria-label={t('界面语言')}
              value={locale}
              onChange={(event) => {
                const next = event.target.value as Locale;
                if (!chooseLocale(next))
                  notify(
                    createTranslator(next)(
                      '语言已切换，但浏览器暂时无法记住这个选择。',
                    ),
                  );
              }}
            >
              {LOCALES.map((value) => (
                <option key={value} value={value} lang={value}>
                  {LOCALE_NAMES[value]}
                </option>
              ))}
            </select>
            <div
              className="theme-switch"
              role="group"
              aria-label={t('外观模式')}
            >
              {(
                [
                  ['light', t('浅色模式'), Sun],
                  ['dark', t('深色模式'), Moon],
                  ['system', t('跟随系统'), Monitor],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  title={label}
                  aria-pressed={preference === value}
                  onClick={() => {
                    if (!chooseTheme(value))
                      notify(t('外观已切换，但浏览器暂时无法记住这个选择。'));
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
            <span className="today-date">
              {formatDate(now, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
              <span>{DAYS[(now.getDay() + 6) % 7]}</span>
            </span>
            <div className="topbar-divider" />
            <span className="avatar" aria-label={t('个人课表小天地')}>
              M
            </span>
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div>
              <div className="heading-kicker">
                <Sparkles size={12} aria-hidden="true" /> READY, SET, SPARKLE!
              </div>
              <h1>
                {page === 'schedule'
                  ? t('新的一周，元气加载！')
                  : t('课程小队，全员集合！')}
              </h1>
              <p>
                {page === 'schedule'
                  ? t('带上好奇心出发，也要记得给自己充充电呀。')
                  : t('把喜欢的知识装进口袋，校园冒险就要开始啦。')}
              </p>
            </div>
            <div className="heading-actions">
              {isDemo && (
                <button
                  className="text-button blank-start"
                  onClick={() => setModal('blank')}
                >
                  {t('使用空白课表')}
                  <ArrowUpRight size={13} />
                </button>
              )}
              <button
                className="button secondary"
                onClick={() => setModal('import')}
              >
                <Upload size={16} />
                {t('导入课表')}
              </button>
              <button className="button primary" onClick={() => add()}>
                <Plus size={18} />
                {t('添加课程')}
              </button>
            </div>
          </section>
          {storageError && (
            <div className="notice error" role="alert">
              {t(storageError)}
              <button className="text-button" onClick={exportCourses}>
                {t('导出当前课表')}
              </button>
            </div>
          )}
          <section className="summary-strip">
            <div className="summary-item">
              <span className="summary-icon blue">
                <BookOpen size={19} />
              </span>
              <div>
                <span>{t('本周课程')}</span>
                <strong>
                  {uniqueCourses}
                  <small>{t('门课程')}</small>
                </strong>
              </div>
            </div>
            <div className="summary-item">
              <span className="summary-icon peach">
                <Clock3 size={19} />
              </span>
              <div>
                <span>{t('学习能量')}</span>
                <strong>
                  {lessons}
                  <small>{t('节课')}</small>
                </strong>
              </div>
            </div>
            <div className="summary-item">
              <span className="summary-icon lavender">
                <Coffee size={19} />
              </span>
              <div>
                <span>{t('充电时间')}</span>
                <strong>
                  {freeDays}
                  <small>{t('天无课')}</small>
                </strong>
              </div>
            </div>
            <div className="semester-summary">
              <span className="semester-tag">{semesterName}</span>
              <button
                className="text-button"
                onClick={() => setModal('settings')}
              >
                {t('共 {0} 周', { 0: settings.totalWeeks })}
                <SlidersHorizontal size={14} />
              </button>
            </div>
          </section>
          <div className="content-layout">
            <section className="schedule-panel">
              <div className="schedule-toolbar">
                <div className="week-control">
                  <h2>
                    {page === 'courses'
                      ? t('全部课程')
                      : t('第 {0} 周', { 0: String(week).padStart(2, '0') })}
                  </h2>
                  {page === 'schedule' && (
                    <>
                      <span className="date-range">
                        {formatDate(selectedStart, {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        —{' '}
                        {formatDate(selectedEnd, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <div className="week-arrows">
                        <button
                          className="icon-button"
                          aria-label={t('上一周')}
                          disabled={week === 1}
                          onClick={() => setWeek(week - 1)}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t('下一周')}
                          disabled={week === settings.totalWeeks}
                          onClick={() => setWeek(week + 1)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                      <button
                        className="this-week"
                        disabled={
                          actualWeek < 1 || actualWeek > settings.totalWeeks
                        }
                        onClick={() =>
                          setWeek(
                            Math.max(
                              1,
                              Math.min(actualWeek, settings.totalWeeks),
                            ),
                          )
                        }
                      >
                        {t('本周')}
                      </button>
                    </>
                  )}
                </div>
                <div className="view-switch">
                  <button
                    aria-label={t('周课表视图')}
                    className={
                      page === 'schedule' && view === 'week' ? 'active' : ''
                    }
                    onClick={() => {
                      setPage('schedule');
                      setView('week');
                    }}
                  >
                    <LayoutGrid size={15} />
                    <span>{t('周视图')}</span>
                  </button>
                  <button
                    aria-label={t('课程列表视图')}
                    className={
                      view === 'list' || page === 'courses' ? 'active' : ''
                    }
                    onClick={() => setView('list')}
                  >
                    <List size={16} />
                    <span>{t('列表')}</span>
                  </button>
                </div>
              </div>
              <div className="schedule-subtoolbar">
                <label className="search-box">
                  <Search size={16} />
                  <input
                    aria-label={t('搜索课程、教师或教室')}
                    placeholder={t('搜索课程、教师或教室')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label={t('清除搜索')}
                      onClick={() => setQuery('')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
                <div className="table-options">
                  {isDemo && (
                    <span className="demo-badge">{t('示例课表')}</span>
                  )}
                  {page === 'schedule' && view === 'week' && (
                    <label className="weekend-toggle">
                      <input
                        type="checkbox"
                        checked={showWeekend}
                        onChange={(e) => setShowWeekend(e.target.checked)}
                      />
                      <span className="toggle-track" />
                      {t('显示周末')}
                    </label>
                  )}
                  <button
                    className="icon-button"
                    aria-label={t('导出 Excel 课表')}
                    title={t('导出 Excel 课表')}
                    onClick={exportCourses}
                  >
                    <ArrowDownToLine size={16} />
                  </button>
                </div>
              </div>
              {page === 'schedule' && view === 'week' ? (
                <>
                  <div className="timetable-scroll">
                    <div
                      className="timetable"
                      style={{
                        gridTemplateColumns: `48px repeat(${days.length}, minmax(100px, 1fr))`,
                      }}
                    >
                      <div className="time-column-heading">
                        {formatDate(selectedStart, { month: 'short' })}
                      </div>
                      {days.map((day, i) => {
                        const date = dateAtWeek(settings, week, i + 1),
                          today = localDate(date) === localDate(now);
                        return (
                          <div
                            className={`day-heading ${today ? 'today' : ''}`}
                            key={day}
                          >
                            <span>{day}</span>
                            <strong>
                              {String(date.getDate()).padStart(2, '0')}
                            </strong>
                            {today && <i />}
                          </div>
                        );
                      })}
                      <div className="period-column">
                        {settings.periods.map((p, i) => (
                          <div
                            className={`period-label ${i === 4 || i === 8 ? 'break-top' : ''}`}
                            key={i}
                          >
                            <strong>{String(i + 1).padStart(2, '0')}</strong>
                            <span>{p.start}</span>
                            <span>{p.end}</span>
                          </div>
                        ))}
                      </div>
                      {days.map((day, i) => {
                        const dayCourses = filtered
                          .filter((c) => c.day === i + 1)
                          .sort((a, b) => a.start - b.start || a.end - b.end);
                        const clusters: Course[][] = [];
                        for (const c of dayCourses) {
                          const last = clusters[clusters.length - 1];
                          if (last && last.some((v) => v.end >= c.start))
                            last.push(c);
                          else clusters.push([c]);
                        }
                        return (
                          <div
                            key={day}
                            className={`day-column ${localDate(dateAtWeek(settings, week, i + 1)) === localDate(now) ? 'today-column' : ''}`}
                          >
                            <div className="grid-lines">
                              {settings.periods.map((_, j) => (
                                <button
                                  key={j}
                                  className={
                                    j === 4 || j === 8 ? 'break-top' : ''
                                  }
                                  aria-label={t('{0}第{1}节添加课程', {
                                    0: day,
                                    1: j + 1,
                                  })}
                                  onClick={() => {
                                    setEditing({
                                      id: crypto.randomUUID(),
                                      name: '',
                                      room: '',
                                      teacher: '',
                                      note: '',
                                      day: i + 1,
                                      start: j + 1,
                                      end: Math.min(j + 2, 12),
                                      weeks: Array.from(
                                        { length: settings.totalWeeks },
                                        (_, k) => k + 1,
                                      ),
                                      color: 'blue',
                                    });
                                    setModal('course');
                                  }}
                                  tabIndex={-1}
                                />
                              ))}
                            </div>
                            {clusters.flatMap((cluster) =>
                              cluster.map((course, index) => (
                                <div
                                  className="course-position"
                                  key={course.id}
                                  style={{
                                    top: `${(course.start - 1) * 64 + 4}px`,
                                    height: `${(course.end - course.start + 1) * 64 - 8}px`,
                                    left: `calc(${(index / cluster.length) * 100}% + 4px)`,
                                    width: `calc(${100 / cluster.length}% - 8px)`,
                                  }}
                                >
                                  <CourseCard
                                    course={course}
                                    compact={
                                      course.end === course.start ||
                                      cluster.length > 1
                                    }
                                    onClick={() => edit(course)}
                                  />
                                </div>
                              )),
                            )}
                            {!dayCourses.length && i >= 5 && !query && (
                              <div className="weekend-empty">
                                <Coffee size={20} />
                                <span>
                                  {t('今日份空闲')}
                                  <br />
                                  {t('自由放电吧')}
                                </span>
                                <button
                                  onClick={() => add(i + 1)}
                                  aria-label={t('{0}添加课程', { 0: day })}
                                >
                                  <Plus size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {filtered.length === 0 && (
                    <div className="inline-empty">
                      <BookOpen size={18} />
                      {query
                        ? t('没有找到匹配的课程')
                        : t(
                            '课表还是空空的，添加课程或导入课表，开启新篇章吧。',
                          )}
                      {!query && (
                        <button className="text-button" onClick={() => add()}>
                          {t('添加课程')}
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="course-list">
                  {(page === 'courses' ? allFiltered : filtered).length ===
                  0 ? (
                    <div className="list-empty">
                      <BookOpen size={35} />
                      <h3>
                        {query
                          ? t('没有找到匹配的课程')
                          : t('第一门课，等你来解锁。')}
                      </h3>
                      <p>
                        {query
                          ? t('这门课好像躲起来了，换个关键词试试吧。')
                          : t('添加一门课程，或让 Excel 帮你把课表填好吧。')}
                      </p>
                      {!query && (
                        <button
                          className="button primary"
                          onClick={() => add()}
                        >
                          <Plus size={16} />
                          {t('添加课程')}
                        </button>
                      )}
                    </div>
                  ) : (
                    [...(page === 'courses' ? allFiltered : filtered)]
                      .sort((a, b) => a.day - b.day || a.start - b.start)
                      .map((c) => (
                        <button
                          className="course-list-row"
                          key={c.id}
                          onClick={() => edit(c)}
                        >
                          <span className={`list-course-icon ${c.color}`}>
                            <BookOpen size={19} />
                          </span>
                          <div className="list-course-name">
                            <strong>{c.name}</strong>
                            <span>
                              {c.teacher || t('教师待定')} ·{' '}
                              {c.room || t('地点待定')}
                            </span>
                          </div>
                          <div className="list-course-time">
                            <strong>
                              {t('{0} · {1}–{2} 节', {
                                0: DAYS[c.day - 1],
                                1: c.start,
                                2: c.end,
                              })}
                            </strong>
                            <span>
                              {t('第 {0} 周', { 0: formatWeeks(c.weeks) })}
                            </span>
                          </div>
                          <ChevronRight size={17} />
                        </button>
                      ))
                  )}
                </div>
              )}
              <footer className="schedule-footer">
                <span>
                  <span className="save-dot" />
                  {storageError
                    ? t('更改尚未保存')
                    : changed || !isDemo
                      ? t('已自动保存至此浏览器')
                      : t('示例数据 · 导入课表，开启你的新学期')}
                </span>
                <span>
                  {t('点击课程卡片即可编辑')}
                  <ArrowUpRight size={12} />
                </span>
              </footer>
            </section>
            <aside className="right-rail">
              <section className="upcoming-panel">
                <div className="rail-heading">
                  <h3>{t('即将开始')}</h3>
                  <span className="live-dot" />
                </div>
                <p className="rail-description">
                  {t('下一节课，准备好出发了吗？')}
                </p>
                {upcoming.length ? (
                  upcoming.map(({ course, date, week: w }, i) => (
                    <button
                      className="upcoming-course"
                      key={`${course.id}-${w}`}
                      onClick={() => edit(course)}
                    >
                      <div className="upcoming-timeline">
                        <span className={i === 0 ? 'first' : ''} />
                        {i < upcoming.length - 1 && <i />}
                      </div>
                      <div className="upcoming-content">
                        <span className="upcoming-date">
                          {localDate(date) === localDate(now)
                            ? t('今天')
                            : formatDate(date, {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                          · {settings.periods[course.start - 1].start}
                          {i === 0 && <small>NEXT</small>}
                        </span>
                        <strong>{course.name}</strong>
                        <span className="upcoming-room">
                          <MapPin size={12} />
                          {course.room || t('地点待定')}
                        </span>
                        <span className={`upcoming-tag ${course.color}`}>
                          {t('{0} · {1}–{2}  节', {
                            0: DAYS[course.day - 1],
                            1: course.start,
                            2: course.end,
                          })}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="upcoming-empty">
                    <Coffee size={27} />
                    <p>
                      {t('暂时没有待上课程，休息一下吧')}
                      <br />
                      <small>{t('休息也是元气补给喔。')}</small>
                    </p>
                  </div>
                )}
                <button
                  className="rail-link"
                  onClick={() => {
                    setPage('courses');
                    setView('list');
                  }}
                >
                  {t('查看全部课程')}
                  <ArrowRight size={15} />
                </button>
              </section>
              <section className="week-progress">
                <div>
                  <span>{t('本周进度条')}</span>
                  <strong>
                    {Math.floor(weekPassed)}
                    <small>%</small>
                  </strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${weekPassed}%` }} />
                </div>
                <p>
                  {weekPassed >= 100
                    ? t('本周篇章完结，辛苦啦！')
                    : weekPassed <= 0
                      ? t('新篇章待开启，准备出发！')
                      : t('一点点前进，也在闪闪发光。')}
                </p>
              </section>
              <section className="quote-card">
                <div className="mascot-art" aria-hidden="true">
                  <svg viewBox="0 0 180 150" fill="none">
                    <ellipse cx="89" cy="133" rx="63" ry="10" fill="#d8ecff" />
                    <path
                      d="M35 128c-14 0-16-19-3-23 0-15 23-20 30-8 8-8 26-2 24 11 18-3 23 20 7 23H35Z"
                      fill="white"
                    />
                    <g className="bunny">
                      <ellipse
                        cx="72"
                        cy="42"
                        rx="13"
                        ry="31"
                        transform="rotate(-13 72 42)"
                        fill="#fffefd"
                        stroke="#93bfdf"
                        strokeWidth="2"
                      />
                      <ellipse
                        cx="107"
                        cy="42"
                        rx="13"
                        ry="31"
                        transform="rotate(13 107 42)"
                        fill="#fffefd"
                        stroke="#93bfdf"
                        strokeWidth="2"
                      />
                      <ellipse
                        cx="72"
                        cy="39"
                        rx="6"
                        ry="19"
                        transform="rotate(-13 72 39)"
                        fill="#f9dfe9"
                      />
                      <ellipse
                        cx="107"
                        cy="39"
                        rx="6"
                        ry="19"
                        transform="rotate(13 107 39)"
                        fill="#f9dfe9"
                      />
                      <ellipse
                        cx="90"
                        cy="108"
                        rx="29"
                        ry="26"
                        fill="#fffefd"
                        stroke="#93bfdf"
                        strokeWidth="2"
                      />
                      <path
                        d="M48 79c0-24 19-37 42-37s42 13 42 37c0 24-19 31-42 31S48 103 48 79Z"
                        fill="#fffefd"
                        stroke="#93bfdf"
                        strokeWidth="2"
                      />
                      <ellipse cx="63" cy="87" rx="8" ry="5" fill="#f6cbdc" />
                      <ellipse cx="117" cy="87" rx="8" ry="5" fill="#f6cbdc" />
                      <ellipse cx="75" cy="78" rx="3.5" ry="5" fill="#426b8c" />
                      <ellipse
                        cx="105"
                        cy="78"
                        rx="3.5"
                        ry="5"
                        fill="#426b8c"
                      />
                      <circle cx="76" cy="76" r="1.2" fill="white" />
                      <circle cx="106" cy="76" r="1.2" fill="white" />
                      <path
                        d="m87 85 3 2 3-2m-9 5c2 4 5 4 6 0 1 4 4 4 6 0"
                        stroke="#426b8c"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="m66 111 24 4 24-4v24l-24 4-24-4Z"
                        fill="#b6dcfb"
                        stroke="#78aad2"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M90 116v22m-17-19 10 2m-10 5 10 2m14-7 10-2m-10 9 10-2"
                        stroke="#78aad2"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <ellipse
                        cx="63"
                        cy="117"
                        rx="7"
                        ry="5"
                        fill="#fffefd"
                        stroke="#93bfdf"
                        strokeWidth="1.5"
                      />
                      <ellipse
                        cx="117"
                        cy="117"
                        rx="7"
                        ry="5"
                        fill="#fffefd"
                        stroke="#93bfdf"
                        strokeWidth="1.5"
                      />
                    </g>
                    <path
                      className="mascot-star"
                      d="m145 35 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
                      fill="#f9df8d"
                      stroke="#dbc47b"
                      strokeLinejoin="round"
                    />
                    <path
                      d="m30 64 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"
                      fill="#b5d9f7"
                    />
                    <circle cx="148" cy="92" r="3" fill="#f5c9dc" />
                    <circle cx="37" cy="39" r="2" fill="#b5d9f7" />
                  </svg>
                </div>
                <span className="quote-kicker">YOUR LITTLE CHEER SQUAD</span>
                <h3>
                  {t('今天也有在')}
                  <br />
                  {t('好好长大呀。')}
                </h3>
                <p>
                  {t('学习之余记得伸个懒腰，')}
                  <br />
                  {t('小兔给你补充一点元气。')}
                </p>
              </section>
              <div className="rail-footnote">
                <ShieldCheck size={14} />
                <span>
                  {t('校园日常，按你的节奏。')}
                  <br />
                  {t('你的数据，留在本地。')}
                </span>
              </div>
            </aside>
          </div>
          <footer className="page-footer">
            <span>Moving-on Schedule</span>
            <span>{t('把日常过成喜欢的番。')}</span>
            <span>A NEW CHAPTER, EVERY DAY</span>
          </footer>
        </main>
      </div>
      {modal === 'course' && (
        <CourseForm
          course={editing}
          day={newDay}
          totalWeeks={settings.totalWeeks}
          courses={courses}
          onSave={(course) => {
            if (editing && !courses.some((c) => c.id === editing.id)) {
              update({ ...data, isDemo: false, courses: [...courses, course] });
              setModal(null);
              notify(t('新课程已添加，课程小队 +1！'));
            } else save(course);
          }}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'import' && (
        <ImportModal
          totalWeeks={settings.totalWeeks}
          isDemo={isDemo}
          existing={courses}
          onApply={(imported, replace) => {
            update({
              ...data,
              courses: replace ? imported : [...courses, ...imported],
              isDemo: false,
            });
            setModal(null);
            notify(t('已导入 {0} 条课程安排', { 0: imported.length }));
          }}
          onClose={() => setModal(null)}
          notify={notify}
        />
      )}
      {modal === 'settings' && (
        <SettingsModal
          settings={settings}
          courses={courses}
          onSave={(next) => {
            update({ ...data, settings: next });
            setWeek(Math.min(week, next.totalWeeks));
            setModal(null);
            notify(t('课表设置已更新'));
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'blank' && (
        <Modal
          title={t('从空白课表开始')}
          subtitle={t('翻开空白小本本，写下你的校园篇章。')}
          onClose={() => setModal(null)}
        >
          <p className="blank-description">
            {t(
              '这会清除当前 {0}  条安排，保留学期和作息设置。之后可以手动添加课程或导入 Excel。',
              { 0: courses.length },
            )}
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              {t('取消')}
            </button>
            <button
              className="button primary"
              onClick={() => {
                update({ ...data, courses: [], isDemo: false });
                setModal(null);
                notify(t('空白课表已就绪，新篇章开始！'));
              }}
            >
              {t('创建空白课表')}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal
          title={t('欢迎来到课表小天地！')}
          subtitle={t('你的课表小伙伴，陪你解锁每个新学期。')}
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <div>
              <CalendarDays />
              <section>
                <h3>{t('第一步：设定校园时钟')}</h3>
                <p>
                  {t(
                    '在「课表设置」中填写第一周的周一、总周数和作息时间。使用箭头或侧边日历切换周次。',
                  )}
                </p>
              </section>
            </div>
            <div>
              <Plus />
              <section>
                <h3>{t('添加与管理课程')}</h3>
                <p>
                  {t(
                    '点击「添加课程」或课表空白格录入。点击课程卡片可修改或删除。支持指定周次、单双周；时间重叠的课程会并排显示。',
                  )}
                </p>
              </section>
            </div>
            <div>
              <FileSpreadsheet />
              <section>
                <h3>{t('从 Excel 搬进来')}</h3>
                <p>
                  {t(
                    '下载导入模板，按每行一条安排填写 .xlsx 或 UTF-8 .csv。预览无错误后确认导入。你可以追加课程，也可以选择替换当前课表。',
                  )}
                </p>
              </section>
            </div>
            <div>
              <ShieldCheck />
              <section>
                <h3>{t('属于你的本地空间')}</h3>
                <p>
                  {t(
                    '课程保存于当前浏览器，无需登录。清除浏览器数据、使用隐私窗口或更换设备时不会保留。建议通过课表右上方的下载按钮定期导出 Excel。首版暂不提供云同步。',
                  )}
                </p>
              </section>
            </div>
          </div>
          <div className="modal-actions">
            <button className="button primary" onClick={() => setModal(null)}>
              {t('开始我的新学期')}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button aria-label={t('关闭提示')} onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
