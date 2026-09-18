import { expect, test } from '@playwright/test';
import { createTranslator, LOCALES } from '../src/i18n';
import { SAMPLE_COURSES } from '../src/schedule';
import { TIMED_SETTINGS } from '../src/testFixtures';

for (const locale of LOCALES) {
  test(`${locale}: hide individual meetings, retain them after reload, and restore from All courses`, async ({
    page,
  }, testInfo) => {
    const t = createTranslator(locale);
    const base = {
      ...SAMPLE_COURSES[0],
      name: 'Mathematics',
      weeks: [1, 2, 3],
    };
    await page.clock.install({ time: new Date('2026-09-14T07:00:00+08:00') });
    await page.addInitScript(
      ({ locale, courses, settings }) => {
        if (localStorage.getItem('moving-on-schedule.data')) return;
        localStorage.setItem('moving-on-schedule.locale', locale);
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
        locale,
        settings: { ...TIMED_SETTINGS, totalWeeks: 3 },
        courses: [
          { ...base, id: 'monday', room: 'Monday room' },
          { ...base, id: 'wednesday', day: 3, room: 'Wednesday room' },
          {
            ...base,
            id: 'clock',
            name: 'Clock course',
            day: 2,
            timing: 'time',
            start: '14:00',
            end: '15:00',
          },
        ],
      },
    );
    const navigate = async (label: string) => {
      if (await page.locator('.mobile-menu').isVisible())
        await page.locator('.mobile-menu').click();
      await page
        .locator('.sidebar nav button')
        .filter({ hasText: label })
        .click();
    };
    const cards = page.locator('.timetable .course-card');
    const visibility = page.getByRole('switch', {
      name: t('course.showOnTimetable'),
    });
    await page.goto('/');
    await expect(cards).toHaveCount(3);
    await cards.filter({ hasText: 'Monday room' }).click();
    await expect(visibility).toBeChecked();
    await visibility.focus();
    await page.keyboard.press('Space');
    await expect(visibility).not.toBeChecked();
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: 'Wednesday room' })).toHaveCount(1);
    await expect(
      page.locator('.upcoming-course').filter({ hasText: 'Monday room' }),
    ).toHaveCount(0);
    await expect(page.locator('.upcoming-course').first()).toContainText(
      'Clock course',
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('moving-on-schedule.data') ?? '{}',
            ).data?.schedule.courses.find(
              (course: { id: string }) => course.id === 'monday',
            )?.hidden,
        ),
      )
      .toBe(true);

    for (const [width, height] of [
      [1440, 900],
      [393, 620],
      [320, 480],
    ]) {
      await page.setViewportSize({ width, height });
      for (const colorScheme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
        });
        await visibility.scrollIntoViewIfNeeded();
        await expect(visibility).toBeInViewport();
        const bounds = (await visibility.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        if (
          (width === 1440 && colorScheme === 'light') ||
          (width === 393 && colorScheme === 'dark')
        )
          await page.screenshot({
            path: testInfo.outputPath(`visibility-${width}-${colorScheme}.png`),
          });
      }
    }
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(cards).toHaveCount(2);
    await navigate(t('course.all'));
    await expect(page.locator('.course-list-row')).toHaveCount(3);
    await expect(page.locator('.course-hidden-label')).toHaveText(
      t('course.hidden'),
    );
    await page
      .locator('.course-list-row')
      .filter({ hasText: 'Monday room' })
      .click();
    await expect(visibility).not.toBeChecked();
    await page
      .getByRole('button', { name: t('course.edit'), exact: true })
      .click();
    await expect(visibility).not.toBeChecked();
    await visibility.click();
    await expect(visibility).toBeChecked();
    await page
      .getByRole('button', { name: t('ui.saveChanges'), exact: true })
      .click();
    await expect(page.locator('.course-hidden-label')).toHaveCount(0);
    await navigate(t('schedule.title'));
    await expect(cards).toHaveCount(3);
    await expect(page.locator('.upcoming-course').first()).toContainText(
      'Monday room',
    );
    await cards.filter({ hasText: 'Clock course' }).click();
    await visibility.click();
    await page.keyboard.press('Escape');
    await expect(cards).toHaveCount(2);
    await expect(page.locator('.clock-day')).toHaveCount(0);
    await expect(
      page.locator('.upcoming-course').filter({ hasText: 'Clock course' }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: t('ui.nextWeek'), exact: true })
      .click();
    await expect(cards).toHaveCount(2);
  });
}
