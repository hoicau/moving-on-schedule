import {
  compareCourses,
  courseClock,
  courseOccursInWeek,
  currentWeek,
  dateAtWeek,
  localDate,
  type Course,
  type Settings,
} from './schedule';

export function courseOccurrence(
  course: Course,
  settings: Settings,
  week: number,
) {
  const date = dateAtWeek(settings, week, course.day);
  const at = (time: string): Date | null => {
    if (!time) return null;
    const value = new Date(date);
    const [hour, minute] = time.split(':').map(Number);
    value.setHours(hour, minute, 0, 0);
    return value;
  };
  const clock = courseClock(course, settings);
  return { course, date, start: at(clock.start), end: at(clock.end), week };
}
export type Occurrence = ReturnType<typeof courseOccurrence>;
export function occurrenceIsPast(entry: Occurrence, now: Date) {
  return (
    localDate(entry.date) < localDate(now) || (!!entry.end && entry.end <= now)
  );
}

export function recentCourses(
  courses: Course[],
  settings: Settings,
  now: Date,
) {
  const current: Occurrence[] = [],
    untimed: Occurrence[] = [];
  let candidates: Occurrence[] = [];
  for (
    let week = Math.max(1, currentWeek(settings, now));
    week <= settings.totalWeeks;
    week++
  ) {
    for (const course of courses) {
      if (course.hidden || !courseOccursInWeek(course, settings, week))
        continue;
      const entry = courseOccurrence(course, settings, week);
      if (occurrenceIsPast(entry, now)) continue;
      const today = localDate(entry.date) === localDate(now);
      if (
        today &&
        entry.start &&
        entry.end &&
        entry.start <= now &&
        now < entry.end
      )
        current.push(entry);
      else if (today && (!entry.start || (entry.start <= now && !entry.end)))
        untimed.push(entry);
      else if (!candidates.length || entry.date < candidates[0].date)
        candidates = [entry];
      else if (+entry.date === +candidates[0].date) candidates.push(entry);
    }
    if (candidates.length) break;
  }
  // Unknown times cannot establish a next class or justify skipping today's
  // uncertain courses in favor of a later date.
  const next =
    untimed.length || candidates.some((entry) => !entry.start)
      ? []
      : candidates.filter(
          (entry) => !candidates.some((other) => other.start! < entry.start!),
        );
  return { current, untimed, next };
}

// Preview several occurrences across days, retaining all current/next classes
// and today's uncertain courses beyond the normal three-item cutoff.
export function upcomingCourses(
  courses: Course[],
  settings: Settings,
  now: Date,
) {
  const recent = recentCourses(courses, settings, now);
  const essential = [...recent.current, ...recent.untimed, ...recent.next];
  const entries: Occurrence[] = [];
  for (
    let week = Math.max(1, currentWeek(settings, now));
    week <= settings.totalWeeks;
    week++
  ) {
    for (const course of courses) {
      if (course.hidden || !courseOccursInWeek(course, settings, week))
        continue;
      const entry = courseOccurrence(course, settings, week);
      if (!occurrenceIsPast(entry, now)) entries.push(entry);
    }
  }
  return entries
    .sort(
      (a, b) =>
        +a.date - +b.date || compareCourses(a.course, b.course, settings),
    )
    .filter(
      (entry, index) =>
        index < 3 ||
        essential.some(
          (candidate) =>
            candidate.course.id === entry.course.id &&
            candidate.week === entry.week,
        ),
    );
}
