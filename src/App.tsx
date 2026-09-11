import { localizeDemoText, isDefaultSemester } from './demoText';
import {
  courseOccurrence,
  occurrenceIsPast,
  recentCourses,
} from './occurrences';
import { useNow } from './useNow';
import { MascotCard } from './MascotCard';
import { ComingUp } from './ComingUp';
import { WeekJourney } from './WeekJourney';
import {
  DISPLAY_KEY,
  parseDisplayPreferences,
  type DisplayPreferences,
} from './displayPreferences';
import { useI18n } from './LocaleProvider';
import {
  createTranslator,
  LOCALES,
  LOCALE_NAMES,
  type Locale,
  type Translator,
} from './i18n';
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
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  FileSpreadsheet,
  GraduationCap,
  HelpCircle,
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
  MAX_PERIODS,
  courseOccursInWeek,
  SAMPLE_COURSES,
  conflicts,
  unresolvedConflicts,
  parseCourseTiming,
  courseClock,
  compareCourses,
  isPeriodCourse,
  type PeriodCourse,
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
  'color.sage',
  'color.peach',
  'color.lavender',
  'color.blue',
  'color.yellow',
  'color.rose',
];
function courseTimingLabel(course: Course, t: Translator): string {
  if (course.timing === 'time') return `${course.start}–${course.end}`;
  return course.start === course.end
    ? t('ui.period', { 0: course.start })
    : t('course.periodRange', { 0: course.start, 1: course.end });
}
function courseTimeLabel(
  course: Course,
  settings: Settings,
  t: Translator,
  separator = ' · ',
): string {
  if (course.timing === 'time') return courseTimingLabel(course, t);
  const { start, end } = courseClock(course, settings);
  const periods = courseTimingLabel(course, t);
  if (start && end) return `${start}–${end}${separator}${periods}`;
  if (start)
    return `${t('time.startsAt', { 0: start })}${separator}${periods}${separator}${t('time.incomplete')}`;
  if (end)
    return `${t('time.endsAt', { 0: end })}${separator}${periods}${separator}${t('time.incomplete')}`;
  return `${periods}${separator}${t('time.notSet')}`;
}
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
      error: 'ui.couldNotReadTheLocalTimetableTheOriginalData',
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
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label={t('dialog.close')}
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
  settings,
  course,
  day,
  totalWeeks,
  courses,
  onSave,
  onDelete,
  onClose,
}: {
  settings: Settings;
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
      end: Math.min(2, settings.periods.length),
      weeks: [],
      color: 'blue',
      note: '',
    },
  );
  const [startInput, setStartInput] = useState(String(course?.start ?? 1));
  const [endInput, setEndInput] = useState(
    String(course?.end ?? Math.min(2, settings.periods.length)),
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
  let uncertain: Course[] = [];
  try {
    const candidate = {
      ...draft,
      ...parseCourseTiming(
        startInput,
        endInput,
        locale,
        settings.periods.length,
      ),
      weeks: parseWeeks(weeks, totalWeeks, locale),
    };
    collision = conflicts(candidate, courses, settings);
    uncertain = unresolvedConflicts(candidate, courses, settings);
  } catch {
    /* Inline validation appears on submit. */
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const next = {
        ...draft,
        ...parseCourseTiming(
          startInput,
          endInput,
          locale,
          settings.periods.length,
        ),
        name: draft.name.trim(),
        room: draft.room.trim(),
        teacher: draft.teacher.trim(),
        weeks: parseWeeks(weeks, totalWeeks, locale),
      };
      validateCourse(next, totalWeeks, locale, settings.periods.length);
      onSave(next);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('ui.pleaseCheckTheCourseDetails'),
      );
    }
  }
  return (
    <Modal
      title={isEditing ? t('course.edit') : t('course.add')}

      onClose={onClose}
    >
      <form onSubmit={submit} className="course-form" noValidate>
        <label>
          <span>{t('ui.courseName')}</span>
          <input
            required
            maxLength={100}
            placeholder={t('ui.eGDesignThinking')}
            value={draft.name}
            onChange={(e) => update('name', e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            {t('ui.location')}
            <input
              maxLength={100}
              placeholder={t('ui.buildingRoomOnlineMeeting')}
              value={draft.room}
              onChange={(e) => update('room', e.target.value)}
            />
          </label>
          <label>
            {t('ui.teacher')}
            <input
              maxLength={100}
              placeholder={t('ui.teacherNameOptional')}
              value={draft.teacher}
              onChange={(e) => update('teacher', e.target.value)}
            />
          </label>
        </div>
        <div className="form-grid thirds">
          <label>
            {t('ui.day')}
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
            {t('timing.start')}
            <input
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
              placeholder="1 / 08:00"
              aria-describedby="timing-help"
              required
            />
          </label>
          <label>
            {t('timing.end')}
            <input
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
              placeholder="2 / 09:40"
              aria-describedby="timing-help"
              required
            />
          </label>
        </div>
        <p className="timing-help" id="timing-help">
          {t('timing.help', { 0: settings.periods.length })}
        </p>
        <label>
          <span>{t('ui.teachingWeeks')}</span>
          <input
            required
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            placeholder={t('ui.116135116Odd')}
          />
          <small>{t('ui.useRangesSelectedWeeksOrOddEvenWeeksE')}</small>
        </label>
        <fieldset className="color-field">
          <legend>{t('ui.courseColor')}</legend>
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
          {t('course.remark')}
          <textarea
            maxLength={500}
            rows={2}
            placeholder={t('course.remarkPlaceholder')}
            value={draft.note}
            onChange={(e) => update('note', e.target.value)}
          />
        </label>
        {collision.length > 0 && (
          <div className="notice warning">
            {t('course.overlaps', {
              0: collision
                .map((c) => c.name)
                .join(locale === 'en' ? ', ' : '、'),
            })}
          </div>
        )}
        {uncertain.length > 0 && (
          <p className="notice warning">{t('timing.unknownOverlap')}</p>
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
              {confirmDelete ? t('ui.confirmDeletion') : t('ui.deleteCourse')}
            </button>
          )}
          <span className="settings-storage">
            {t('ui.savedInThisBrowserOnly')}
          </span>
          <button className="button secondary" type="button" onClick={onClose}>
            {t('ui.cancel')}
          </button>
          <button className="button primary" type="submit">
            <Check size={16} />
            {isEditing ? t('ui.saveChanges') : t('course.add')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function ImportModal({
  settings,
  totalWeeks,
  isDemo,
  existing,
  onApply,
  onClose,
  notify,
}: {
  totalWeeks: number;
  isDemo: boolean;
  settings: Settings;
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
      const parsed = await importer.readImport(
        file,
        totalWeeks,
        locale,
        settings.periods.length,
      );
      if (token === generation.current) setResult(parsed);
    } catch (error) {
      if (token === generation.current)
        setError(
          error instanceof Error
            ? error.message
            : t('ui.couldNotReadTheFilePleaseCheckItsExcel'),
        );
    } finally {
      if (token === generation.current) setBusy(false);
    }
  }
  const overlap =
    result?.courses.filter(
      (c, i) =>
        conflicts(
          c,
          [...(replace ? [] : existing), ...result.courses.slice(0, i)],
          settings,
        ).length,
    ).length || 0;
  const unknownOverlap = result?.courses.some(
    (course, i) =>
      unresolvedConflicts(
        course,
        [...(replace ? [] : existing), ...result.courses.slice(0, i)],
        settings,
      ).length,
  );
  async function template() {
    try {
      await (
        await import('./importer')
      ).downloadWorkbook(undefined, locale, settings.periods.length);
      notify(t('ui.excelTemplateDownloaded'));
    } catch {
      setError(t('ui.couldNotDownloadTheTemplatePleaseTryAgain'));
    }
  }
  return (
    <Modal
      title={t('ui.importTimetable')}

      onClose={onClose}
      wide
    >
      <div className="import-steps">
        <span className={!result ? 'active' : 'done'}>
          <b>{result ? <Check size={12} /> : 1}</b>
          {t('ui.chooseFile')}
        </span>
        <i />
        <span className={result ? 'active' : ''}>
          <b>2</b>
          {t('ui.previewImport')}
        </span>
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept=".xlsx,.csv"
        aria-label={t('ui.chooseTimetableFile')}
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
          {busy
            ? t('ui.readingYourTimetable')
            : fileName || t('ui.dropYourExcelFileHere')}
        </strong>
        <span>
          {fileName
            ? t('ui.clickToChooseAnotherFile')
            : t('ui.orClickToChooseAFile')}{' '}
          <ArrowUpRight size={13} />
        </span>
        <small>{t('ui.xlsxOrUtf8CsvUpTo10Mb')}</small>
      </button>
      <div className="template-row">
        <div>
          <strong>{t('import.template')}</strong>
          <p>{t('import.templateHelp')}</p>
        </div>
        <button className="text-button" onClick={template}>
          <ArrowDownToLine size={16} />
          {t('ui.downloadExcelTemplate')}
        </button>
      </div>
      <details className="format-help">
        <summary>{t('ui.viewFormatGuide')}</summary>
        <p>
          {t('import.headerHelp', {
            0: (locale === 'en'
              ? ['name', 'day', 'start', 'end', 'weeks']
              : [
                  'course.name',
                  'ui.day',
                  'ui.firstPeriod',
                  'ui.lastPeriod',
                  'ui.weeks',
                ].map((tKey) => t(tKey))
            ).join(locale === 'en' ? ', ' : '、'),
          })}
        </p>
        <p>{t('ui.daysMonSunOr17Periods112')}</p>
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
              {t('ui.courseMeetingsFound', { 0: result.courses.length })}
            </strong>
            <small>
              {t('ui.sheetRows', {
                0: result.sheet,
                1: result.rows,
              })}
            </small>
          </div>
          {result.errors.length > 0 && (
            <div className="notice error" role="alert">
              <strong>
                {t('ui.fixTheseIssuesAndUploadAgainNothingHasBeen')}
              </strong>
              <ul>
                {result.errors.slice(0, 12).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
              {result.errors.length > 12 && (
                <span>
                  {t('ui.additionalIssues', { 0: result.errors.length - 12 })}
                </span>
              )}
            </div>
          )}
          {unknownOverlap && (
            <p className="notice warning">{t('timing.unknownOverlap')}</p>
          )}
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>{t('course.name')}</th>
                  <th>{t('ui.time')}</th>
                  <th>{t('ui.weeks')}</th>
                  <th>{t('ui.room')}</th>
                </tr>
              </thead>
              <tbody>
                {result.courses.slice(0, 50).map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      {DAYS[c.day - 1]} · {courseTimingLabel(c, t)}
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
              {t('ui.showingTheFirst50MeetingsConfirmToImportAll', {
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
            {isDemo
              ? t('ui.replaceSampleTimetable')
              : t('ui.replaceAllCurrentCourses')}
            <small>
              {replace
                ? t('ui.currentMeetingsToBeRemoved', { 0: existing.length })
                : t('ui.coursesWillBeAddedToYourTimetable')}
            </small>
          </label>
          {overlap > 0 && (
            <div className="notice warning">
              {t('ui.overlappingMeetingsTheyWillAppearSideBySideAfter', {
                0: overlap,
              })}
            </div>
          )}
        </div>
      )}
      <div className="modal-actions">
        <span className="privacy-note">
          <ShieldCheck size={14} />
          {t('ui.filesStayOnThisDevice')}
        </span>
        <div className="action-spacer" />
        <button className="button secondary" onClick={onClose}>
          {t('ui.cancel')}
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
            ? t('ui.importMeetings', { 0: result.courses.length })
            : t('ui.importCourses')}
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
      semester: isDefaultSemester(settings.semester)
        ? t('demo.semester')
        : settings.semester,
    }),
    [error, setError] = useState('');
  const [periodCount, setPeriodCount] = useState(
    String(settings.periods.length),
  );
  const count = Number(periodCount);
  const validCount =
    Number.isInteger(count) && count >= 1 && count <= MAX_PERIODS;
  const visiblePeriods = Array.from(
    { length: validCount ? count : draft.periods.length },
    (_, i) => draft.periods[i] ?? { start: '', end: '' },
  );
  function setPeriodTime(index: number, field: 'start' | 'end', value: string) {
    setDraft((current) => {
      const periods = Array.from(
        { length: Math.max(current.periods.length, visiblePeriods.length) },
        (_, i) => current.periods[i] ?? { start: '', end: '' },
      );
      periods[index] = { ...periods[index], [field]: value };
      return { ...current, periods };
    });
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      if (!validCount)
        throw new Error(t('settings.invalidPeriodCount', { 0: MAX_PERIODS }));
      const next = { ...draft, periods: visiblePeriods };
      validateSettings(next, locale);
      if (courses.some((c) => isPeriodCourse(c) && c.end > count))
        throw new Error(t('settings.periodsInUse', { 0: count }));
      if (courses.some((c) => c.weeks.some((w) => w > draft.totalWeeks)))
        throw new Error(
          t('ui.someCoursesExceedTheNewSemesterLengthAdjustTheir'),
        );
      onSave(next);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : t('ui.pleaseCheckYourSettings'),
      );
    }
  }
  return (
    <Modal
      title={t('ui.timetableSettings')}

      onClose={onClose}
    >
      <form onSubmit={submit} className="course-form" noValidate>
        <label>
          {t('ui.semesterName')}
          <input
            required
            maxLength={60}
            value={draft.semester}
            onChange={(e) => setDraft({ ...draft, semester: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            {t('settings.firstDay')}
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
            {t('ui.semesterLengthWeeks')}
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
        <p className="timing-help">{t('settings.firstWeekHelp')}</p>
        <label>
          {t('settings.periodCount')}
          <input
            type="number"
            min={1}
            max={MAX_PERIODS}
            step={1}
            required
            value={periodCount}
            onChange={(e) => setPeriodCount(e.target.value)}
          />
        </label>
        <div className="period-settings">
          <strong>{t('ui.classTimes')}</strong>
          <p>{t('settings.optionalTimes')}</p>
          <div>
            {visiblePeriods.map((p, i) => (
              <div className="period-setting" key={i}>
                <span>{t('ui.period', { 0: i + 1 })}</span>
                <input
                  aria-label={t('ui.periodStartTime', { 0: i + 1 })}
                  type="text"
                  placeholder="HH:mm"
                  maxLength={5}
                  pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                  value={p.start}
                  onChange={(e) => setPeriodTime(i, 'start', e.target.value)}
                />
                <span>—</span>
                <input
                  aria-label={t('ui.periodEndTime', { 0: i + 1 })}
                  type="text"
                  placeholder="HH:mm"
                  maxLength={5}
                  pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                  value={p.end}
                  onChange={(e) => setPeriodTime(i, 'end', e.target.value)}
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
          <span className="settings-storage">
            {t('ui.savedInThisBrowserOnly')}
          </span>
          <button className="button secondary" type="button" onClick={onClose}>
            {t('ui.cancel')}
          </button>
          <button className="button primary" type="submit">
            {t('ui.saveSettings')}
            <Check size={16} aria-hidden="true" />
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
  const weekStart = dateAtWeek(settings, week);
  const selected =
      localDate(weekStart) < settings.startDate
        ? new Date(`${settings.startDate}T12:00:00`)
        : weekStart,
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
              disabled={
                w < 1 ||
                w > settings.totalWeeks ||
                localDate(date) < settings.startDate
              }
              aria-label={t('calendar.dateWeek', {
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
  showRemarks,
  status,
}: {
  course: Course;
  onClick: () => void;
  compact?: boolean;
  showRemarks: boolean;
  status?: 'past' | 'current' | 'next';
}) {
  const { t } = useI18n();
  return (
    <button
      className={`course-card ${course.color} ${compact ? 'compact' : ''} ${status ? `is-${status}` : ''}`}
      aria-description={
        status === 'current'
          ? t('schedule.currentClass')
          : status === 'next'
            ? t('schedule.nextClass')
            : undefined
      }
      onClick={onClick}
      title={`${course.name} · ${course.room} · ${courseTimingLabel(course, t)}`}
    >
      <span className="course-card-top">
        <span className="course-dot" />
        <span>{courseTimingLabel(course, t)}</span>
        <ArrowUpRight size={12} />
      </span>
      <strong>{course.name}</strong>
      <span className="course-room">
        <MapPin size={12} />
        {course.room || t('ui.locationTbd')}
      </span>
      {(status === 'current' || status === 'next') && (
        <span className="course-state">
          {status === 'current'
            ? t('schedule.currentClass')
            : t('schedule.nextClass')}
        </span>
      )}
      {showRemarks && course.note.trim() && (
        <span className="remark-preview">
          {t('course.remark')}: {course.note}
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
            name: localizeDemoText(course.name, locale),
            teacher: localizeDemoText(course.teacher, locale),
            room: localizeDemoText(course.room, locale),
          }))
        : storedCourses,
    [storedCourses, isDemo, locale],
  );
  const semesterName = isDefaultSemester(settings.semester)
    ? t('demo.semester')
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
    [display, setDisplay] = useState<DisplayPreferences>(() => {
      try {
        return parseDisplayPreferences(localStorage.getItem(DISPLAY_KEY));
      } catch {
        return parseDisplayPreferences(null);
      }
    }),
    [query, setQuery] = useState(''),
    [modal, setModal] = useState<
      'course' | 'detail' | 'import' | 'settings' | 'help' | 'blank' | null
    >(null),
    [editing, setEditing] = useState<Course | undefined>(),
    [newDay, setNewDay] = useState<number | undefined>(),
    [toast, setToast] = useState(''),
    [mobileNav, setMobileNav] = useState(false);
  const now = useNow();
  const { showWeekend, showRemarks } = display;
  function chooseDisplay(next: DisplayPreferences) {
    setDisplay(next);
    try {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(next));
    } catch {
      notify(t('display.saveFailed'));
    }
  }
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!changed) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageError('');
    } catch {
      setStorageError(t('ui.couldNotSaveLocallyStorageMayBeFullExport'));
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
  function showDetails(course: Course) {
    setEditing(course);
    setModal('detail');
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
    notify(editing ? t('course.saved') : t('course.added'));
  }
  function remove(id: string) {
    update({
      ...data,
      isDemo: false,
      courses: courses.filter((c) => c.id !== id),
    });
    setModal(null);
    notify(t('ui.courseDeleted'));
  }
  const matches = (course: Course) =>
    `${course.name} ${course.teacher} ${course.room}`
      .toLowerCase()
      .includes(query.trim().toLowerCase());
  const weekCourses = courses.filter((c) =>
    courseOccursInWeek(c, settings, week),
  );
  const filtered = weekCourses.filter(matches),
    allFiltered = courses.filter(matches);
  const days = showWeekend ? DAYS : DAYS.slice(0, 5);
  const selectedStart = dateAtWeek(settings, week),
    selectedEnd = dateAtWeek(settings, week, 7);
  const recent = useMemo(
    () => recentCourses(courses, settings, now),
    [courses, settings, now],
  );
  function courseStatus(
    course: Course,
  ): 'past' | 'current' | 'next' | undefined {
    if (occurrenceIsPast(courseOccurrence(course, settings, week), now))
      return 'past';
    if (
      recent.current.some(
        (entry) => entry.week === week && entry.course.id === course.id,
      )
    )
      return 'current';
    if (
      recent.next.some(
        (entry) => entry.week === week && entry.course.id === course.id,
      )
    )
      return 'next';
    return undefined;
  }
  async function exportCourses() {
    try {
      await (await import('./importer')).downloadWorkbook(courses, locale);
      notify(t('ui.timetableExportedToExcel'));
    } catch {
      notify(t('ui.exportFailedPleaseTryAgain'));
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
          aria-label={t('ui.movingOnScheduleHome')}
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
            <strong>{t('settings.semester')}</strong>
            <span>{semesterName.split('·').pop()?.trim()}</span>
          </div>
        </div>
        <nav>
          <button
            className={page === 'schedule' ? 'active' : ''}
            onClick={() => {
              setPage('schedule');
              setMobileNav(false);
            }}
          >
            <CalendarDays size={19} />
            {t('schedule.title')}
          </button>
          <button
            className={page === 'courses' ? 'active' : ''}
            onClick={() => {
              setPage('courses');
              setMobileNav(false);
            }}
          >
            <BookOpen size={19} />
            {t('course.all')}
            <span className="nav-count">
              {new Set(courses.map((c) => c.name)).size}
            </span>
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
        <WeekJourney settings={settings} week={week} now={now} />
        <div className="sidebar-grow" />
        <div className="bottom-nav">
          <button onClick={() => setModal('settings')}>
            <Settings2 size={18} />
            {t('ui.timetableSettings')}
          </button>
          <button onClick={() => setModal('help')}>
            <HelpCircle size={18} />
            {t('ui.gettingStarted')}
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label={t('ui.openNavigation')}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={20} />
            </button>
            <strong className="header-brand">Moving-on Schedule</strong>
          </div>
          <div className="topbar-right">
            <select
              className="language-select"
              aria-label={t('ui.language')}
              value={locale}
              onChange={(event) => {
                const next = event.target.value as Locale;
                if (!chooseLocale(next))
                  notify(
                    createTranslator(next)(
                      'ui.languageChangedButThisBrowserCouldNotSaveYour',
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
              aria-label={t('ui.appearance')}
            >
              {(
                [
                  ['light', t('ui.lightMode'), Sun],
                  ['dark', t('ui.darkMode'), Moon],
                  ['system', t('ui.useSystemTheme'), Monitor],
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
                      notify(
                        t('ui.appearanceChangedButThisBrowserCouldNotSaveYour'),
                      );
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
            <span className="avatar" aria-label={t('ui.yourPersonalPlanner')}>
              M
            </span>
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div className="home-title">
              <div className="heading-kicker">
                <Sparkles size={12} aria-hidden="true" /> READY, SET, SHINING!
              </div>
              <h1>
                {page === 'schedule'
                  ? t('schedule.greeting')
                  : t('course.greeting')}
              </h1>
              <p>
                {page === 'schedule'
                  ? t('schedule.greetingHint')
                  : t('course.greetingHint')}
              </p>
              {!courses.length && <p>{t('schedule.emptyHelp')}</p>}
            </div>
            <div className="heading-actions">
              {isDemo && (
                <button
                  className="text-button blank-start"
                  onClick={() => setModal('blank')}
                >
                  {t('ui.startFresh')}
                  <ArrowUpRight size={13} />
                </button>
              )}
              <button
                className="button secondary"
                onClick={() => setModal('import')}
              >
                <Upload size={16} />
                {t('ui.importTimetable')}
              </button>
              <button className="button primary" onClick={() => add()}>
                <Plus size={18} />
                {t('course.add')}
              </button>
            </div>
          </section>
          {storageError && (
            <div className="notice error" role="alert">
              {t(storageError)}
              <button className="text-button" onClick={exportCourses}>
                {t('ui.exportCurrentTimetable')}
              </button>
            </div>
          )}
          <div
            className={`content-layout ${page === 'schedule' ? 'with-coming-up' : ''}`}
          >
            {page === 'schedule' && (
              <ComingUp
                courses={courses}
                settings={settings}
                now={now}
                showRemarks={showRemarks}
                onSelect={showDetails}
                onViewAll={() => setPage('courses')}
              />
            )}
            <section className="schedule-panel">
              <div className="schedule-toolbar">
                <div className="week-control">
                  <h2>
                    {page === 'courses'
                      ? t('course.all')
                      : t('schedule.week', {
                          0: String(week).padStart(2, '0'),
                        })}
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
                          aria-label={t('ui.previousWeek')}
                          disabled={week === 1}
                          onClick={() => setWeek(week - 1)}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t('ui.nextWeek')}
                          disabled={week === settings.totalWeeks}
                          onClick={() => setWeek(week + 1)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                    </>
                  )}
                  <details
                    className="display-options"
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.currentTarget.open = false;
                        event.currentTarget.querySelector('summary')?.focus();
                      }
                    }}
                  >
                    <summary>
                      <SlidersHorizontal size={16} />
                      {t('display.title')}
                    </summary>
                    <div className="display-menu">
                      {page === 'schedule' && (
                        <label>
                          <input
                            type="checkbox"
                            checked={showWeekend}
                            onChange={(e) =>
                              chooseDisplay({
                                ...display,
                                showWeekend: e.target.checked,
                              })
                            }
                          />
                          {t('ui.weekends')}
                        </label>
                      )}
                      <label>
                        <input
                          type="checkbox"
                          checked={showRemarks}
                          onChange={(e) =>
                            chooseDisplay({
                              ...display,
                              showRemarks: e.target.checked,
                            })
                          }
                        />
                        {t('display.showRemarks')}
                      </label>
                      <button onClick={exportCourses}>
                        <ArrowDownToLine size={16} />
                        {t('ui.exportExcelTimetable')}
                      </button>
                    </div>
                  </details>
                </div>
                <label className="search-box">
                  <Search size={16} />
                  <input
                    aria-label={t('ui.searchCoursesTeachersRooms')}
                    placeholder={t('ui.searchCoursesTeachersRooms')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label={t('ui.clearSearch')}
                      onClick={() => setQuery('')}
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>
              </div>
              {!showWeekend &&
                filtered.some((course) => course.day > 5) &&
                page === 'schedule' && (
                  <button
                    className="weekend-notice"
                    onClick={() =>
                      chooseDisplay({ ...display, showWeekend: true })
                    }
                  >
                    {t('schedule.hiddenWeekend')}
                  </button>
                )}
              {page === 'schedule' ? (
                <>
                  <div className="timetable-scroll">
                    <div
                      className="timetable"
                      data-periods={settings.periods.length}
                      data-remarks={
                        showRemarks &&
                        filtered.some((course) => course.note.trim())
                      }
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
                            {today && (
                              <span className="today-label">
                                {t('ui.today')}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {filtered.some((course) => course.timing === 'time') && (
                        <>
                          <div className="clock-row-label">
                            {t('timing.clockCourses')}
                          </div>
                          {days.map((day, i) => (
                            <div className="clock-day" key={`clock-${day}`}>
                              {filtered
                                .filter(
                                  (course) =>
                                    course.timing === 'time' &&
                                    course.day === i + 1,
                                )
                                .sort((a, b) => compareCourses(a, b, settings))
                                .map((course) => (
                                  <CourseCard
                                    key={course.id}
                                    course={course}
                                    showRemarks={showRemarks}
                                    status={courseStatus(course)}
                                    onClick={() => showDetails(course)}
                                  />
                                ))}
                            </div>
                          ))}
                        </>
                      )}
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
                          .filter(isPeriodCourse)
                          .filter((c) => c.day === i + 1)
                          .sort((a, b) => a.start - b.start || a.end - b.end);
                        const clusters: PeriodCourse[][] = [];
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
                                  disabled={
                                    localDate(
                                      dateAtWeek(settings, week, i + 1),
                                    ) < settings.startDate
                                  }
                                  className={
                                    j === 4 || j === 8 ? 'break-top' : ''
                                  }
                                  aria-label={t('ui.addACourseOnPeriod', {
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
                                      end: Math.min(
                                        j + 2,
                                        settings.periods.length,
                                      ),
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
                                  className={`course-position ${course.start === 5 || course.start === 9 ? 'after-break' : ''}`}
                                  key={course.id}
                                  style={{
                                    top: `calc(${course.start - 1} * var(--row-height) + var(--course-top-inset))`,
                                    height: `calc(${course.end - course.start + 1} * var(--row-height) - var(--course-top-inset) - 6px)`,
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
                                    showRemarks={showRemarks}
                                    status={courseStatus(course)}
                                    onClick={() => showDetails(course)}
                                  />
                                </div>
                              )),
                            )}
                            {!filtered.some((course) => course.day === i + 1) &&
                              i >= 5 &&
                              localDate(dateAtWeek(settings, week, i + 1)) >=
                                settings.startDate &&
                              !query && (
                                <div className="weekend-empty">
                                  <Coffee size={20} aria-hidden="true" />
                                  <span>{t('schedule.noClasses')}</span>
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
                        ? t('ui.noMatchingCourses')
                        : courses.length
                          ? t('schedule.emptyWeek')
                          : t('schedule.emptyHelp')}
                      {!query && (
                        <button className="text-button" onClick={() => add()}>
                          {t('course.add')}
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
                          ? t('ui.noMatchingCourses')
                          : courses.length
                            ? t('schedule.emptyWeek')
                            : t('schedule.noCourses')}
                      </h3>
                      <p>
                        {query
                          ? t('search.tryAnother')
                          : courses.length
                            ? t('schedule.browseOtherWeeks')
                            : t('schedule.emptyHelp')}
                      </p>
                      {!query && (
                        <button
                          className="button primary"
                          onClick={() => add()}
                        >
                          <Plus size={16} />
                          {t('course.add')}
                        </button>
                      )}
                    </div>
                  ) : (
                    [...(page === 'courses' ? allFiltered : filtered)]
                      .sort((a, b) => compareCourses(a, b, settings))
                      .map((c) => (
                        <button
                          className="course-list-row"
                          key={c.id}
                          onClick={() => showDetails(c)}
                        >
                          <span className={`list-course-icon ${c.color}`}>
                            <BookOpen size={19} />
                          </span>
                          <div className="list-course-name">
                            <strong>{c.name}</strong>
                            {showRemarks && c.note.trim() && (
                              <span className="remark-preview">
                                {t('course.remark')}: {c.note}
                              </span>
                            )}
                            <span>
                              {c.teacher || t('ui.teacherTbd')} ·{' '}
                              {c.room || t('ui.locationTbd')}
                            </span>
                          </div>
                          <div className="list-course-time">
                            <strong>
                              {DAYS[c.day - 1]} ·{' '}
                              {courseTimeLabel(c, settings, t)}
                            </strong>
                            <span>
                              {t('schedule.week', { 0: formatWeeks(c.weeks) })}
                            </span>
                          </div>
                          <ChevronRight size={17} />
                        </button>
                      ))
                  )}
                </div>
              )}
            </section>
            {page === 'schedule' && <MascotCard />}
          </div>
          <footer className="page-footer">
            <div className="footer-identity">
              <span>{t('footer.motto')}</span>
              <span className="footer-source">
                <span className="footer-divider" aria-hidden="true">
                  |
                </span>
                <a
                  href="https://github.com/hoicau/moving-on-schedule"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('footer.sourceCode')}
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </span>
            </div>
          </footer>
        </main>
      </div>
      {modal === 'detail' && editing && (
        <Modal
          title={editing.name}
          subtitle={t('course.details')}
          onClose={() => setModal(null)}
        >
          <dl className="course-details">
            <div>
              <dt>{t('ui.day')}</dt>
              <dd>{DAYS[editing.day - 1]}</dd>
            </div>
            <div>
              <dt>{t('course.time')}</dt>
              <dd>{courseTimeLabel(editing, settings, t)}</dd>
            </div>
            <div>
              <dt>{t('ui.weeks')}</dt>
              <dd>{formatWeeks(editing.weeks)}</dd>
            </div>
            <div>
              <dt>{t('ui.room')}</dt>
              <dd>{editing.room || t('ui.locationTbd')}</dd>
            </div>
            <div>
              <dt>{t('ui.teacher')}</dt>
              <dd>{editing.teacher || t('ui.teacherTbd')}</dd>
            </div>
            {editing.note.trim() && (
              <div>
                <dt>{t('course.remark')}</dt>
                <dd className="remark-full">{editing.note}</dd>
              </div>
            )}
          </dl>
          {conflicts(editing, courses, settings).length > 0 && (
            <p className="notice warning">
              {t('course.conflictDetails', {
                0: conflicts(editing, courses, settings)
                  .map((course) => course.name)
                  .join(', '),
              })}
            </p>
          )}
          {unresolvedConflicts(editing, courses, settings).length > 0 && (
            <p className="notice warning">{t('timing.unknownOverlap')}</p>
          )}
          <div className="modal-actions">
            <button className="button primary" onClick={() => edit(editing)}>
              {t('course.edit')}
            </button>
          </div>
        </Modal>
      )}
      {modal === 'course' && (
        <CourseForm
          settings={settings}
          course={editing}
          day={newDay}
          totalWeeks={settings.totalWeeks}
          courses={courses}
          onSave={(course) => {
            if (editing && !courses.some((c) => c.id === editing.id)) {
              update({ ...data, isDemo: false, courses: [...courses, course] });
              setModal(null);
              notify(t('course.added'));
            } else save(course);
          }}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'import' && (
        <ImportModal
          settings={settings}
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
            notify(t('ui.courseMeetingsImported', { 0: imported.length }));
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
            notify(t('ui.timetableSettingsUpdated'));
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'blank' && (
        <Modal
          title={t('ui.createBlankTimetable')}

          onClose={() => setModal(null)}
        >
          <p className="blank-description">
            {t('ui.thisRemovesAllCurrentMeetingsAndKeepsYourSemester', {
              0: courses.length,
            })}
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              {t('ui.cancel')}
            </button>
            <button
              className="button primary"
              onClick={() => {
                update({ ...data, courses: [], isDemo: false });
                setModal(null);
                notify(t('schedule.blankCreated'));
              }}
            >
              {t('ui.createBlankTimetable')}
              <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal
          title={t('ui.gettingStarted')}

          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <div>
              <CalendarDays />
              <section>
                <h3>{t('help.settingsTitle')}</h3>
                <p>
                  {t('ui.inTimetableSettingsSetTheFirstMondaySemesterLength')}
                </p>
              </section>
            </div>
            <div>
              <Plus />
              <section>
                <h3>{t('ui.addAndManageCourses')}</h3>
                <p>{t('help.manageCourses')}</p>
              </section>
            </div>
            <div>
              <FileSpreadsheet />
              <section>
                <h3>{t('help.importTitle')}</h3>
                <p>{t('ui.downloadTheTemplateAndUseOneMeetingPerRow')}</p>
              </section>
            </div>
            <div>
              <CalendarDays />
              <section>
                <h3>{t('display.title')}</h3>
                <p>{t('help.display')}</p>
              </section>
            </div>
            <div>
              <ShieldCheck />
              <section>
                <h3>{t('help.storageTitle')}</h3>
                <p>{t('ui.coursesStayInThisBrowserWithNoSignIn')}</p>
              </section>
            </div>
          </div>
          <div className="modal-actions">
            <button className="button primary" onClick={() => setModal(null)}>
              {t('dialog.done')}
              <Check size={16} aria-hidden="true" />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button
            aria-label={t('ui.dismissNotification')}
            onClick={() => setToast('')}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
