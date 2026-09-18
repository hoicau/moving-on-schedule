import { TIMED_SETTINGS } from './testFixtures';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SETTINGS,
  SAMPLE_COURSES,
  decodeSaved,
  localDate,
} from './schedule';
import {
  courseOccurrence,
  recentCourses,
  upcomingCourses,
} from './occurrences';
import { parseDisplayPreferences } from './displayPreferences';

const settings = { ...TIMED_SETTINGS, startDate: '2026-09-07', totalWeeks: 3 };
const monday = { ...SAMPLE_COURSES[0], weeks: [1, 3] };

test('hidden meetings are excluded from previews and cannot affect visible next-class badges', () => {
  const hidden = { ...monday, hidden: true };
  const visible = {
    ...monday,
    id: 'visible-same-name',
    timing: 'time' as const,
    start: '10:00',
    end: '11:00',
  };
  for (const periods of [settings.periods, DEFAULT_SETTINGS.periods]) {
    const timetable = { ...settings, periods };
    for (const time of ['07:00', '08:30', '10:30', '12:00']) {
      const now = new Date(`2026-09-07T${time}:00`);
      assert.deepEqual(
        recentCourses([hidden, visible], timetable, now),
        recentCourses([visible], timetable, now),
      );
      assert.deepEqual(
        upcomingCourses([hidden, visible], timetable, now),
        upcomingCourses([visible], timetable, now),
      );
      assert.deepEqual(recentCourses([hidden], timetable, now), {
        current: [],
        untimed: [],
        next: [],
      });
      assert.deepEqual(upcomingCourses([hidden], timetable, now), []);
    }
  }
  const restored = { ...hidden, hidden: false };
  assert.equal(
    upcomingCourses([restored], settings, new Date('2026-09-07T07:00:00'))[0]
      .course.id,
    monday.id,
  );
});

test('timeline previews multiple days in clock order and skips finished occurrences', () => {
  const afternoon = { ...monday, id: 'afternoon', start: 5, end: 6 };
  const tuesday = { ...monday, id: 'tuesday', day: 2, start: 3, end: 4 };
  const entries = upcomingCourses(
    [tuesday, afternoon, monday],
    settings,
    new Date('2026-09-07T09:40:00'),
  );
  assert.deepEqual(
    entries.map((entry) => [entry.course.id, localDate(entry.date)]),
    [
      ['afternoon', '2026-09-07'],
      ['tuesday', '2026-09-08'],
      [monday.id, '2026-09-21'],
    ],
  );
});

test('timeline keeps all simultaneous next classes and unknown-time classes today', () => {
  const simultaneous = Array.from({ length: 5 }, (_, i) => ({
    ...monday,
    id: `parallel-${i}`,
    weeks: [1],
  }));
  assert.equal(
    upcomingCourses(simultaneous, settings, new Date('2026-09-07T07:00:00'))
      .length,
    5,
  );
  const unknown = upcomingCourses(
    simultaneous,
    { ...settings, periods: DEFAULT_SETTINGS.periods },
    new Date('2026-09-07T12:00:00'),
  );
  assert.equal(unknown.length, 5);
  assert.ok(
    unknown.every((entry) => entry.start === null && entry.end === null),
  );
});

test('timeline excludes dates before a midweek semester start and ends at semester boundary', () => {
  const partial = { ...settings, startDate: '2026-09-09', totalWeeks: 1 };
  const thursday = { ...monday, id: 'thursday', day: 4 };
  assert.deepEqual(
    upcomingCourses(
      [monday, thursday],
      partial,
      new Date('2026-09-07T07:00:00'),
    ).map((entry) => entry.course.id),
    ['thursday'],
  );
  assert.deepEqual(
    upcomingCourses(
      [monday, thursday],
      partial,
      new Date('2026-09-14T07:00:00'),
    ),
    [],
  );
});

test('recent classes include the exact start and exclude the exact end', () => {
  const at = (time: string) =>
    recentCourses([monday], settings, new Date(`2026-09-07T${time}`));
  assert.equal(at('07:59:59').next[0].course.id, monday.id);
  assert.equal(at('08:00:00').current[0].course.id, monday.id);
  assert.equal(at('09:39:59').current.length, 1);
  assert.equal(at('09:40:00').current.length, 0);
  assert.equal(at('09:40:00').next[0].week, 3);
});

test('upcoming uses actual dates across Sundays, odd weeks and semester boundaries', () => {
  const before = recentCourses(
    [monday],
    settings,
    new Date('2026-09-06T23:59:59'),
  );
  assert.equal(localDate(before.next[0].date), '2026-09-07');
  const later = recentCourses(
    [monday],
    settings,
    new Date('2026-09-13T23:59:59'),
  );
  assert.equal(localDate(later.next[0].date), '2026-09-21');
  assert.deepEqual(
    recentCourses([monday], settings, new Date('2026-09-21T09:40:00')),
    { current: [], untimed: [], next: [] },
  );
  assert.deepEqual(
    recentCourses([monday], settings, new Date('2026-10-01T08:00:00')),
    { current: [], untimed: [], next: [] },
  );
  assert.deepEqual(
    recentCourses([], settings, new Date('2026-09-07T08:00:00')),
    { current: [], untimed: [], next: [] },
  );
});

test('simultaneous classes and overlapping ongoing classes are all retained', () => {
  const sameTime = { ...monday, id: 'same-time' };
  const overlap = { ...monday, id: 'overlap', start: 2, end: 3 };
  const input = [sameTime, overlap, monday];
  const before = recentCourses(
    input,
    settings,
    new Date('2026-09-07T07:00:00'),
  );
  assert.deepEqual(
    before.next.map((v) => v.course.id).sort(),
    [monday.id, sameTime.id].sort(),
  );
  const during = recentCourses(
    input,
    settings,
    new Date('2026-09-07T09:00:00'),
  );
  assert.equal(during.current.length, 3);
  assert.equal(during.next.length, 2);
});

test('late periods, weekends and modified class times use their full occurrence interval', () => {
  const sunday = { ...monday, day: 7, start: 12, end: 12 };
  const changed = {
    ...settings,
    periods: settings.periods.map((period, i) =>
      i === 11 ? { start: '22:00', end: '23:00' } : period,
    ),
  };
  const entry = courseOccurrence(sunday, changed, 1);
  assert.equal(localDate(entry.date), '2026-09-13');
  assert.equal(entry.start?.getHours(), 22);
  assert.equal(
    recentCourses([sunday], changed, new Date('2026-09-13T22:30:00')).current
      .length,
    1,
  );
  assert.equal(
    recentCourses([sunday], changed, new Date('2026-09-13T23:00:00')).current
      .length,
    0,
  );
});

test('display preferences default safely and preserve existing remarks independently', () => {
  for (const raw of [null, '{}', 'null', 'invalid', '{"showRemarks":"true"}']) {
    assert.deepEqual(parseDisplayPreferences(raw), {
      showRemarks: false,
      showWeekend: true,
    });
  }
  const preference = { showRemarks: true, showWeekend: false };
  assert.deepEqual(
    parseDisplayPreferences(JSON.stringify(preference)),
    preference,
  );
  const raw = JSON.stringify({
    version: 1,
    isDemo: false,
    courses: [{ ...monday, note: 'Keep my old remark' }],
    settings,
  });
  assert.equal(decodeSaved(raw).courses[0].note, 'Keep my old remark');
  parseDisplayPreferences('{"showRemarks":false}');
  assert.equal(decodeSaved(raw).courses[0].note, 'Keep my old remark');
});

test('blank times never invent current or next classes and still preview future dates', () => {
  assert.ok(
    DEFAULT_SETTINGS.periods.every(
      (period) => period.start === '' && period.end === '',
    ),
  );
  const blank = { ...settings, periods: DEFAULT_SETTINGS.periods };
  const result = recentCourses(
    [monday],
    blank,
    new Date('2026-09-07T12:00:00'),
  );
  assert.equal(result.current.length, 0);
  assert.equal(result.untimed[0].course.id, monday.id);
  assert.deepEqual(result.next, []);
  const later = recentCourses([monday], blank, new Date('2026-09-08T12:00:00'));
  assert.equal(later.untimed.length, 0);
  assert.deepEqual(later.next, []);
  assert.equal(
    upcomingCourses([monday], blank, new Date('2026-09-08T12:00:00'))[0].week,
    3,
  );
});

test('unknown times prevent next-class guesses across days and mixed timing types', () => {
  const unknown = { ...monday, weeks: [1] };
  const tomorrow = { ...unknown, id: 'tomorrow', day: 2 };
  const timed = {
    ...unknown,
    id: 'timed',
    timing: 'time' as const,
    start: '14:00',
    end: '15:00',
  };
  const blank = { ...settings, periods: DEFAULT_SETTINGS.periods };
  const now = new Date('2026-09-07T12:00:00');
  for (const courses of [
    [unknown, tomorrow],
    [unknown, timed],
    [unknown, { ...timed, day: 2 }],
    [tomorrow, { ...timed, day: 2 }],
  ]) {
    assert.deepEqual(recentCourses(courses, blank, now).next, []);
    assert.equal(upcomingCourses(courses, blank, now).length, courses.length);
  }
  assert.equal(recentCourses([timed], blank, now).next[0].course.id, timed.id);
  assert.equal(
    recentCourses([unknown, tomorrow], settings, now).next[0].course.id,
    tomorrow.id,
  );
});

test('partial times expose uncertainty until enough information is available', () => {
  const partial = {
    ...settings,
    periods: DEFAULT_SETTINGS.periods.map((period, i) =>
      i === 0 ? { ...period, start: '08:00' } : period,
    ),
  };
  assert.equal(
    recentCourses([monday], partial, new Date('2026-09-07T07:00:00')).next[0]
      .course.id,
    monday.id,
  );
  const afterStart = recentCourses(
    [monday],
    partial,
    new Date('2026-09-07T08:00:00'),
  );
  assert.equal(afterStart.current.length, 0);
  assert.equal(afterStart.untimed.length, 1);
  const endOnly = {
    ...settings,
    periods: DEFAULT_SETTINGS.periods.map((period, i) =>
      i === 1 ? { ...period, end: '09:40' } : period,
    ),
  };
  assert.equal(
    recentCourses([monday], endOnly, new Date('2026-09-07T09:00:00')).untimed
      .length,
    1,
  );
  assert.equal(
    recentCourses([monday], endOnly, new Date('2026-09-07T09:40:00')).untimed
      .length,
    0,
  );
});
