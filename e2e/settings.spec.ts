import { expect, test } from '@playwright/test';
import { TIMED_SETTINGS } from '../src/testFixtures';

const copy = {
  en: {
    settings: 'Timetable settings',
    count: 'Periods per day',
    save: 'Save settings',
  },
  'zh-Hans': { settings: '课表设置', count: '每日节数', save: '保存设置' },
  'zh-Hant': { settings: '課表設定', count: '每日節數', save: '儲存設定' },
};

for (const [locale, labels] of Object.entries(copy)) {
  test(`${locale}: settings stay compact and actions remain reachable on short screens`, async ({
    page,
  }) => {
    await page.addInitScript((locale) => {
      localStorage.setItem('moving-on-schedule.locale', locale);
    }, locale);
    await page.goto('/');
    await page
      .getByRole('button', { name: labels.settings, exact: true })
      .click();
    await page.evaluate(() => document.fonts.ready);
    const dialog = page.getByRole('dialog');
    const save = dialog.getByRole('button', { name: labels.save, exact: true });
    const body = dialog.locator('.settings-body');

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 768, height: 600 },
      { width: 393, height: 700 },
      { width: 320, height: 480 },
      { width: 844, height: 320 },
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
        await body.evaluate((el) => {
          el.scrollTop = 0;
        });
        await expect(save).toBeInViewport({ ratio: 1 });
        const layout = await dialog.evaluate((el) => {
          const body = el.querySelector('.settings-body')!;
          return {
            height: el.getBoundingClientRect().height,
            overflow: body.scrollWidth - body.clientWidth,
            allPeriodsFit: body.scrollHeight <= body.clientHeight + 1,
          };
        });
        expect(layout.overflow).toBeLessThanOrEqual(1);
        if (viewport.width === 1440) {
          expect(layout.height).toBeLessThan(620);
          expect(layout.allPeriodsFit).toBe(true);
        }
        await dialog.getByLabel(labels.count, { exact: true }).fill('30');
        const lastInput = dialog.locator('.period-setting input').last();
        await lastInput.focus();
        await expect(lastInput).toBeInViewport({ ratio: 1 });
        const inputBox = (await lastInput.boundingBox())!;
        const actionsBox = (await dialog
          .locator('.modal-actions')
          .boundingBox())!;
        expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(actionsBox.y);
        await expect(save).toBeInViewport({ ratio: 1 });
        await page.keyboard.press('Tab');
        await expect(
          dialog.getByRole('button').filter({ hasText: /^(Cancel|取消)$/ }),
        ).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(save).toBeFocused();
        await dialog.getByLabel(labels.count, { exact: true }).fill('12');
      }
    }
  });
}

test('clear times only changes the draft until saved and preserves the daily period count', async ({
  page,
}) => {
  await page.addInitScript((settings) => {
    if (localStorage.getItem('moving-on-schedule.data')) return;
    localStorage.setItem(
      'moving-on-schedule.v1',
      JSON.stringify({
        version: 1,
        isDemo: false,
        settings,
        courses: [],
      }),
    );
  }, TIMED_SETTINGS);
  await page.goto('/');
  const open = page.getByRole('button', {
    name: 'Timetable settings',
    exact: true,
  });
  await open.click();
  const dialog = page.getByRole('dialog');
  const clear = dialog.getByRole('button', {
    name: 'Clear',
    exact: true,
  });
  await dialog.getByLabel('Periods per day', { exact: true }).fill('6');
  await clear.click();
  await expect(clear).toBeDisabled();
  // Clearing also removes draft times temporarily hidden by a reduced count.
  await dialog.getByLabel('Periods per day', { exact: true }).fill('12');
  for (const input of await dialog.locator('.period-setting input').all()) {
    await expect(input).toHaveValue('');
  }
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await open.click();
  await expect(
    dialog.getByRole('textbox', { name: 'Period 1 start time', exact: true }),
  ).toHaveValue(TIMED_SETTINGS.periods[0].start);
  await expect(clear).toBeEnabled();
  // Tab order follows period numbering across the two columns.
  await dialog
    .getByRole('textbox', { name: 'Period 6 end time', exact: true })
    .focus();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('textbox', { name: 'Period 7 start time', exact: true }),
  ).toBeFocused();
  await clear.click();
  await dialog
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await open.click();
  await expect(
    dialog.getByLabel('Periods per day', { exact: true }),
  ).toHaveValue('12');
  await expect(clear).toBeDisabled();
  for (const input of await dialog.locator('.period-setting input').all()) {
    await expect(input).toHaveValue('');
  }
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('moving-on-schedule.data')!).data
            .schedule.settings,
      ),
    )
    .toEqual({
      ...TIMED_SETTINGS,
      periods: TIMED_SETTINGS.periods.map(() => ({ start: '', end: '' })),
    });
});
