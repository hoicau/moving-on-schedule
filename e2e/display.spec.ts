import { expect, test } from '@playwright/test';
import { DEFAULT_SETTINGS, SAMPLE_COURSES } from '../src/schedule';
import { TIMED_SETTINGS } from '../src/testFixtures';

for (const hasTimes of [false, true]) {
  test(`${hasTimes ? 'known' : 'missing'} times control next-class badges in timetable and Coming up`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-09-14T07:00:00+08:00') });
    await page.addInitScript(
      ({ settings, courses }) => {
        localStorage.setItem(
          'moving-on-schedule.v1',
          JSON.stringify({
            version: 1,
            isDemo: false,
            settings,
            courses,
          }),
        );
      },
      {
        settings: hasTimes ? TIMED_SETTINGS : DEFAULT_SETTINGS,
        courses: SAMPLE_COURSES,
      },
    );
    await page.goto('/');
    await expect(page.locator('.timetable .course-card')).toHaveCount(10);
    await expect(page.locator('.upcoming-course')).toHaveCount(3);
    await expect(page.locator('.timetable .course-card.is-next')).toHaveCount(
      hasTimes ? 1 : 0,
    );
    await expect(page.locator('.upcoming-date small')).toHaveCount(
      hasTimes ? 1 : 0,
    );
    if (hasTimes) {
      await expect(
        page.locator('.timetable .course-card.is-next'),
      ).toContainText('Calculus A');
      await expect(
        page
          .locator('.upcoming-course')
          .filter({ has: page.locator('.upcoming-date small') }),
      ).toContainText('Calculus A');
    } else {
      await expect(page.locator('.upcoming-course').last()).toContainText(
        'Sep 15',
      );
    }
  });
}

test('occupied periods have no add hover target, including card gaps and filtered courses', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-14T00:00:00+08:00') });
  await page.addInitScript(
    ({ settings, course }) => {
      localStorage.setItem(
        'moving-on-schedule.v1',
        JSON.stringify({
          version: 1,
          isDemo: false,
          settings,
          courses: [{ ...course, weeks: [2] }],
        }),
      );
    },
    { settings: DEFAULT_SETTINGS, course: SAMPLE_COURSES[0] },
  );
  await page.goto('/');
  const occupied = page.getByRole('button', {
    name: 'Add a course on Mon, period 1',
    exact: true,
  });
  const secondPeriod = page.getByRole('button', {
    name: 'Add a course on Mon, period 2',
    exact: true,
  });
  const empty = page.getByRole('button', {
    name: 'Add a course on Mon, period 3',
    exact: true,
  });
  await expect(occupied).toBeDisabled();
  await expect(secondPeriod).toBeDisabled();
  await expect(empty).toBeEnabled();
  for (const width of [1440, 393]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      await occupied.scrollIntoViewIfNeeded();
      const bounds = (await occupied.boundingBox())!;
      // The two-pixel gap beside the inset card used to expose the add button.
      await page.mouse.move(bounds.x + 2, bounds.y + bounds.height / 2);
      expect(
        await occupied.evaluate(
          (el) => getComputedStyle(el, '::after').content,
        ),
      ).toBe('none');
      await page.mouse.click(bounds.x + 2, bounds.y + bounds.height / 2);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await empty.hover();
      expect(
        await empty.evaluate((el) => getComputedStyle(el, '::after').content),
      ).toBe('"+"');
    }
  }
  await page.locator('.timetable .course-card').click();
  await expect(page.locator('.course-details')).toBeVisible();
  await page.keyboard.press('Escape');
  await empty.click();
  await expect(page.locator('.course-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.search-box > button').click();
  await page.locator('.search-box input').fill('No matching course');
  await expect(page.locator('.timetable .course-card')).toHaveCount(0);
  await expect(occupied).toBeDisabled();
  await page.getByRole('button', { name: 'Next week', exact: true }).click();
  await expect(occupied).toBeEnabled();
});

for (const [locale, teacherLabel, remarkLabel] of [
  ['en', 'Show teacher', 'Show remarks'],
  ['zh-Hans', '显示教师', '显示备注'],
  ['zh-Hant', '顯示教師', '顯示備註'],
]) {
  test(`${locale}: display toggles keep long course details bounded`, async ({
    page,
  }) => {
    const teacher = 'Professor Long Teacher Name 教師姓名'.repeat(8);
    const note = 'Long remark 備註內容 '.repeat(80);
    const courses = SAMPLE_COURSES.map((course) => ({
      ...course,
      name: `${course.name} Long Course Name 課程名稱`,
      teacher,
      room: 'Long Building Name 教學大樓 1001',
      note,
    }));
    await page.clock.install({ time: new Date('2026-09-14T00:00:00+08:00') });
    await page.addInitScript(
      ({ locale, courses, settings }) => {
        if (localStorage.getItem('moving-on-schedule.data')) return;
        localStorage.setItem('moving-on-schedule.locale', locale);
        localStorage.setItem(
          'moving-on-schedule.v1',
          JSON.stringify({
            version: 1,
            isDemo: false,
            courses,
            settings,
          }),
        );
      },
      { locale, courses, settings: DEFAULT_SETTINGS },
    );
    await page.goto('/');
    const timetable = page.locator('.timetable');
    await expect(timetable.locator('.course-card')).toHaveCount(courses.length);
    const originalHeight = await timetable.evaluate(
      (el) => el.getBoundingClientRect().height,
    );
    await page.locator('.display-options summary').click();
    await expect(
      page.getByLabel(teacherLabel, { exact: true }),
    ).not.toBeChecked();
    await expect(timetable.locator('.course-teacher')).toHaveCount(0);
    await page.getByLabel(teacherLabel, { exact: true }).check();
    await page.getByLabel(remarkLabel, { exact: true }).check();
    await expect(timetable.locator('.course-teacher')).toHaveCount(
      courses.length,
    );
    expect(
      await timetable.evaluate((el) => el.getBoundingClientRect().height),
    ).toBe(originalHeight);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem('moving-on-schedule.data') ?? '{}')
              .data?.preferences.display,
        ),
      )
      .toMatchObject({ showTeacher: true, showRemarks: true });
    await page.reload();
    await expect(timetable.locator('.course-teacher')).toHaveCount(
      courses.length,
    );
    for (const width of [1440, 393, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme: theme as 'light' | 'dark' });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        const layout = await timetable
          .locator('.course-card')
          .evaluateAll((cards) =>
            cards.map((card) => {
              const bounds = card.getBoundingClientRect();
              const metadata = card
                .querySelector('.course-room')!
                .getBoundingClientRect();
              const remark = card
                .querySelector('.remark-preview')!
                .getBoundingClientRect();
              const teacher = card
                .querySelector('.course-teacher')!
                .getBoundingClientRect();
              return {
                teacherOnSeparateLine: teacher.top >= metadata.bottom,
                contained:
                  metadata.right <= bounds.right &&
                  remark.bottom <= bounds.bottom,
                teacherWidth: teacher.width,
                remarkHeight: remark.height,
              };
            }),
          );
        for (const card of layout) {
          expect(card.contained, JSON.stringify({ width, theme, card })).toBe(
            true,
          );
          expect(card.teacherOnSeparateLine).toBe(true);
          expect(card.teacherWidth).toBeGreaterThan(8);
          expect(card.remarkHeight).toBeLessThan(16);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
    await timetable.locator('.course-card').first().click();
    await expect(page.locator('.course-details')).toContainText(teacher);
    await expect(page.locator('.course-details')).toContainText(note.trim());
  });
}

test('single-period remarks use bounded row height and hidden weekend remarks do not expand it', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-09-14T00:00:00+08:00') });
  await page.addInitScript(
    ({ settings, sample }) => {
      localStorage.setItem(
        'moving-on-schedule.v1',
        JSON.stringify({
          version: 1,
          isDemo: false,
          settings,
          courses: [
            {
              ...sample,
              start: 1,
              end: 1,
              day: 6,
              note: 'Long remark '.repeat(100),
            },
          ],
        }),
      );
    },
    { settings: DEFAULT_SETTINGS, sample: SAMPLE_COURSES[0] },
  );
  await page.goto('/');
  await page.locator('.display-options summary').click();
  await page.getByLabel('Show remarks', { exact: true }).check();
  await page.getByLabel('Show teacher', { exact: true }).check();
  const timetable = page.locator('.timetable');
  expect(
    await timetable.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--row-height'),
    ),
  ).toBe('92px');
  const card = timetable.locator('.course-card');
  const dimensions = await card.evaluate((el) => ({
    bounds: el.getBoundingClientRect().toJSON(),
    children: Array.from(el.children).map((child) => ({
      className: child.className,
      rect: child.getBoundingClientRect().toJSON(),
      lineHeight: getComputedStyle(child).lineHeight,
      clamp: getComputedStyle(child).webkitLineClamp,
    })),
  }));
  expect(
    dimensions.children.find((child) => child.className === 'remark-preview')!
      .rect.bottom,
    JSON.stringify(dimensions),
  ).toBeLessThanOrEqual(dimensions.bounds.bottom);
  await page.getByLabel('Weekends', { exact: true }).uncheck();
  expect(
    await timetable.evaluate((el) =>
      getComputedStyle(el).getPropertyValue('--row-height'),
    ),
  ).toBe('60px');
});
