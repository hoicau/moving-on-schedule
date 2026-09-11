import { useMemo } from 'react';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { useI18n } from './LocaleProvider';
import { recentCourses, upcomingCourses, type Occurrence } from './occurrences';
import {
  courseClock,
  currentWeek,
  type Course,
  type Settings,
} from './schedule';

export function ComingUp({
  courses,
  settings,
  now,
  showRemarks,
  onSelect,
  onViewAll,
}: {
  courses: Course[];
  settings: Settings;
  now: Date;
  showRemarks: boolean;
  onSelect: (course: Course) => void;
  onViewAll: () => void;
}) {
  const { t, date: formatDate, days } = useI18n();
  const entries = useMemo(
    () => upcomingCourses(courses, settings, now),
    [courses, settings, now],
  );
  const recent = useMemo(
    () => recentCourses(courses, settings, now),
    [courses, settings, now],
  );
  const includes = (list: Occurrence[], entry: Occurrence) =>
    list.some(
      (candidate) =>
        candidate.course.id === entry.course.id &&
        candidate.week === entry.week,
    );
  return (
    <section className="upcoming-panel" aria-labelledby="coming-up-title">
      <div className="rail-heading">
        <h3 id="coming-up-title">{t('schedule.comingUp')}</h3>
      </div>
      <p className="rail-description">{t('schedule.comingUpHint')}</p>
      {entries.length ? (
        <div className="upcoming-entries">
          {entries.map((entry, index) => {
            const { course } = entry;
            const current = includes(recent.current, entry);
            const untimed = includes(recent.untimed, entry);
            const next = includes(recent.next, entry);
            const clock = courseClock(course, settings);
            const timing =
              course.timing === 'time'
                ? `${course.start}–${course.end}`
                : course.start === course.end
                  ? t('ui.period', { 0: course.start })
                  : t('course.periodRange', { 0: course.start, 1: course.end });
            return (
              <button
                className="upcoming-course"
                key={`${course.id}-${entry.week}`}
                onClick={() => onSelect(course)}
              >
                <span className="upcoming-timeline" aria-hidden="true">
                  <span className={current || next ? 'first' : ''} />
                  {index < entries.length - 1 && <i />}
                </span>
                <span className="upcoming-content">
                  <span className="upcoming-date">
                    <span>
                      {formatDate(entry.date, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      / {clock.start || t('time.notSet')}
                    </span>
                    {(current || next) && (
                      <small>
                        {current
                          ? t('schedule.currentClass')
                          : t('schedule.nextBadge')}
                      </small>
                    )}
                  </span>
                  <strong>{course.name}</strong>
                  {showRemarks && course.note.trim() && (
                    <span className="remark-preview">
                      {t('course.remark')}: {course.note}
                    </span>
                  )}
                  <span className="upcoming-room">
                    <MapPin size={14} />
                    {course.room || t('ui.locationTbd')}
                  </span>
                  <span className={`upcoming-tag ${course.color}`}>
                    {days[course.day - 1]} / {timing}
                  </span>
                  {untimed && (
                    <span className="upcoming-uncertain">
                      {t('schedule.todayTimeUnknown')}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="upcoming-empty">
          <CalendarDays size={24} />
          <p>
            {!courses.length
              ? t('schedule.noCourses')
              : currentWeek(settings, now) > settings.totalWeeks
                ? t('schedule.semesterEnded')
                : t('schedule.noMoreCourses')}
          </p>
        </div>
      )}
      <button className="rail-link" onClick={onViewAll}>
        {t('schedule.viewAll')}
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
