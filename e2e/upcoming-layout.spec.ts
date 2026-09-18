import { expect, test } from '@playwright/test';
import { SAMPLE_COURSES } from '../src/schedule';
import { TIMED_SETTINGS } from '../src/testFixtures';

for (const locale of ['en', 'zh-Hans', 'zh-Hant']) {
  test(`${locale}: horizontal previews align mixed remarks, titles and rooms`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-09-18T13:00:00+08:00') });
    await page.addInitScript(
      ({ locale, settings, courses }) => {
        localStorage.setItem('moving-on-schedule.locale', locale);
        localStorage.setItem(
          'moving-on-schedule.display',
          JSON.stringify({ showRemarks: true, showWeekend: true }),
        );
        localStorage.setItem(
          'moving-on-schedule.v1',
          JSON.stringify({ version: 1, isDemo: false, settings, courses }),
        );
      },
      {
        locale,
        settings: TIMED_SETTINGS,
        courses: SAMPLE_COURSES.map((course, index) =>
          index === 0
            ? {
                ...course,
                name: 'Long course title 跨学科课程 '.repeat(3),
                room: 'Long building name 教学楼 302 '.repeat(2),
                note: 'Two-line remark 两行备注 '.repeat(20),
              }
            : course,
        ),
      },
    );
    await page.goto('/');
    const entries = page.locator('.upcoming-entries');
    await expect(entries.locator('.upcoming-course')).toHaveCount(3);
    await expect(entries.locator('.remark-preview')).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    for (const viewport of [
      { width: 393, height: 700 },
      { width: 320, height: 568 },
      { width: 844, height: 390 },
      { width: 1024, height: 1366 },
    ]) {
      await page.setViewportSize(viewport);
      for (const theme of ['light', 'dark'] as const) {
        await page.emulateMedia({ colorScheme: theme });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        const layout = await entries.evaluate((el) => {
          const cards = [...el.querySelectorAll('.upcoming-course')];
          return {
            rows: [
              '.upcoming-timeline',
              '.upcoming-date',
              '.upcoming-content > strong',
              '.upcoming-room',
              '.upcoming-tag',
            ].map((selector) =>
              cards.map(
                (card) =>
                  card.querySelector(selector)!.getBoundingClientRect().top,
              ),
            ),
            contained: cards.every(
              (card) =>
                card.querySelector('.upcoming-tag')!.getBoundingClientRect()
                  .bottom <= card.getBoundingClientRect().bottom,
            ),
            remarkHeight: el
              .querySelector('.remark-preview')!
              .getBoundingClientRect().height,
          };
        });
        for (const row of layout.rows)
          expect(Math.max(...row) - Math.min(...row)).toBeLessThan(1);
        expect(layout.contained).toBe(true);
        expect(layout.remarkHeight).toBeGreaterThan(20);
        expect(layout.remarkHeight).toBeLessThan(30);
        await entries.evaluate((el) => {
          el.scrollLeft = el.scrollWidth;
        });
        await expect(
          entries.locator('.upcoming-course').last(),
        ).toBeInViewport();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
    await entries.locator('.upcoming-course').last().click();
    await expect(page.locator('.course-details')).toBeVisible();
  });
}
