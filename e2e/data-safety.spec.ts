import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const key = 'moving-on-schedule.data';
async function expectSaved(page: Page, expected: Record<string, unknown>) {
  await expect
    .poll(() =>
      page.evaluate((key) => {
        try {
          return JSON.parse(localStorage.getItem(key) ?? 'null')?.data;
        } catch {
          return null;
        }
      }, key),
    )
    .toMatchObject(expected);
  await expect(page.locator('.storage-notice')).toHaveCount(0);
}
async function menu(page: Page) {
  await page.locator('.display-options').evaluate((element) => {
    (element as HTMLDetailsElement).open = true;
  });
}
async function dataManagement(page: Page) {
  if (await page.locator('.mobile-menu').isVisible()) {
    await page.locator('.mobile-menu').click();
  }
  await page
    .getByRole('button', { name: /^(Data management|数据管理|資料管理)$/ })
    .click();
}
async function exported(page: Page) {
  await dataManagement(page);
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Export JSON data', exact: true })
    .click();
  const download = await downloading;
  await page.keyboard.press('Escape');
  return JSON.parse(await readFile((await download.path())!, 'utf8'));
}
async function importFile(page: Page, data: unknown) {
  await dataManagement(page);
  await page
    .getByLabel('Choose timetable file', { exact: true })
    .setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(data)),
    });
}

test('complete JSON export, preview, restore, preferences and reload', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expectSaved(page, { preferences: { theme: 'dark' } });
  await menu(page);
  await page.getByLabel('Show remarks', { exact: true }).check();
  await page.getByLabel('Show teacher', { exact: true }).check();
  await expectSaved(page, {
    preferences: {
      theme: 'dark',
      display: { showRemarks: true, showTeacher: true },
    },
  });
  await page.locator('.display-options summary').click();
  await page.locator('.timetable .course-card').first().click();
  await page
    .getByRole('switch', { name: 'Show on timetable', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expectSaved(page, {
    schedule: {
      courses: expect.arrayContaining([
        expect.objectContaining({ hidden: true }),
      ]),
    },
  });
  const backup = await exported(page);
  expect(
    backup.schedule.courses.filter(
      (course: { hidden?: boolean }) => course.hidden,
    ),
  ).toHaveLength(1);
  expect(backup.preferences.theme).toBe('dark');
  expect(backup.preferences.display.showRemarks).toBe(true);
  expect(backup.preferences.display.showTeacher).toBe(true);
  expect(backup.integrity.value).toMatch(/^[a-f0-9]{64}$/);
  await page.getByRole('button', { name: 'Light mode', exact: true }).click();
  await expectSaved(page, { preferences: { theme: 'light' } });
  await importFile(page, backup);
  await expect(
    page.getByRole('button', { name: 'Restore all data', exact: true }),
  ).toBeEnabled();
  // Preview has no effects until the explicit restore action.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page
    .getByRole('button', { name: 'Restore all data', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await menu(page);
  await expect(page.getByLabel('Show teacher', { exact: true })).toBeChecked();
  expect((await exported(page)).schedule).toEqual(backup.schedule);
});

test('damaged import is rejected without replacing the current schedule', async ({
  page,
}) => {
  await page.goto('/');
  const backup = await exported(page);
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  backup.schedule.courses[0].name = 'Changed without checksum';
  await importFile(page, backup);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'integrity check failed',
  );
  await expect(
    page.getByRole('button', { name: 'Restore all data', exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    before,
  );
});

test('quota failure reports the problem and exports unsaved preferences', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'could not be saved or verified',
  );
  // The error notice provides a reachable export even without opening a menu.
  const downloading = page.waitForEvent('download');
  await page
    .locator('.storage-notice')
    .getByRole('button', { name: 'Export JSON data', exact: true })
    .click();
  const download = await downloading;
  const backup = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(backup.preferences.theme).toBe('dark');
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
});

test('denied storage remains usable without claiming a successful save', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Denied', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'cannot access local storage',
  );
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page
      .locator('.storage-notice')
      .getByRole('button', { name: 'Export JSON data', exact: true }),
  ).toBeVisible();
});

test('corrupt storage is preserved and a validated backup can explicitly repair it', async ({
  page,
}) => {
  await page.goto('/');
  const backup = await exported(page);
  await page.evaluate((key) => localStorage.setItem(key, '{damaged'), key);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('damaged or unsupported');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    '{damaged',
  );
  await page
    .locator('.storage-notice')
    .getByRole('button', { name: 'Import timetable', exact: true })
    .click();
  await page
    .getByLabel('Choose timetable file', { exact: true })
    .setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  await page
    .getByRole('button', { name: 'Restore all data', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectSaved(page, {
    schedule: backup.schedule,
    preferences: backup.preferences,
  });
  expect((await exported(page)).schedule).toEqual(backup.schedule);
});

test('two tabs cannot overwrite each other and confirmed reload adopts the saved state', async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await Promise.all([a.goto('/'), b.goto('/')]);
  await Promise.all([
    expect(
      a.getByRole('button', { name: 'Dark mode', exact: true }),
    ).toBeVisible(),
    expect(
      b.getByRole('button', { name: 'Light mode', exact: true }),
    ).toBeVisible(),
  ]);
  await Promise.all([
    a.getByRole('button', { name: 'Dark mode', exact: true }).click(),
    b.getByRole('button', { name: 'Light mode', exact: true }).click(),
  ]);
  await expect
    .poll(async () =>
      [
        await a.locator('.storage-notice').count(),
        await b.locator('.storage-notice').count(),
      ].reduce((x, y) => x + y),
    )
    .toBe(1);
  const loser = (await a.locator('.storage-notice').count()) ? a : b;
  const winner = loser === a ? b : a;
  await expect(loser.getByRole('alert')).toContainText('Another tab');
  const saved = await winner.evaluate((key) => localStorage.getItem(key), key);
  await loser
    .getByRole('button', { name: 'Use system theme', exact: true })
    .click();
  expect(await loser.evaluate((key) => localStorage.getItem(key), key)).toBe(
    saved,
  );
  await loser
    .getByRole('button', { name: 'Load saved version', exact: true })
    .click();
  await loser
    .getByRole('dialog')
    .getByRole('button', { name: 'Load saved version', exact: true })
    .click();
  await expect(loser.locator('.storage-notice')).toHaveCount(0);
  await expect(loser.locator('html')).toHaveAttribute(
    'data-theme',
    (await winner.locator('html').getAttribute('data-theme'))!,
  );
});

test.describe('display options and data management layout', () => {
  // Layout assertions do not need to wait for sidebar and modal animations.
  // Motion behavior is covered separately in elastic-scroll.spec.ts.
  test.use({ reducedMotion: 'reduce' });

  for (const locale of ['en', 'zh-Hans', 'zh-Hant']) {
    for (const theme of ['light', 'dark']) {
      test(`${locale}, ${theme}: controls stay reachable at every viewport`, async ({
        page,
      }) => {
        await page.goto('/');
        await page.locator('.language-select').selectOption(locale);
        await page
          .locator('.theme-switch button')
          .nth(theme === 'light' ? 0 : 1)
          .click();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));

        for (const [width, height] of [
          [1440, 900],
          [393, 650],
          [320, 568],
          [844, 320],
        ]) {
          await test.step(`${width}x${height}`, async () => {
            await page.setViewportSize({ width, height });
            await page.evaluate(
              () =>
                new Promise<void>((resolve) =>
                  requestAnimationFrame(() =>
                    requestAnimationFrame(() => resolve()),
                  ),
                ),
            );
            await menu(page);
            const bounds = await page.locator('.display-menu').boundingBox();
            expect(bounds!.x).toBeGreaterThanOrEqual(0);
            expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true);
            await dataManagement(page);
            await expect(page.locator('.sidebar')).not.toHaveClass(/open/);
            const actions = page.locator('.import-resource-actions button');
            await expect(actions).toHaveCount(4);
            for (const button of await actions.all()) {
              await button.scrollIntoViewIfNeeded();
              await expect(button).toBeInViewport();
            }
            expect(
              await page
                .getByRole('dialog')
                .evaluate((el) => el.scrollWidth <= el.clientWidth),
            ).toBe(true);
            await page.keyboard.press('Escape');
            await expect(page.getByRole('dialog')).toHaveCount(0);
          });
        }
      });
    }
  }
});

test('a change in another tab after backup preview prevents restore', async ({
  context,
}) => {
  const a = await context.newPage(),
    b = await context.newPage();
  await Promise.all([a.goto('/'), b.goto('/')]);
  const backup = await exported(a);
  await importFile(a, backup);
  await expect(
    a.getByRole('button', { name: 'Restore all data', exact: true }),
  ).toBeEnabled();
  await b.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expectSaved(b, { preferences: { theme: 'dark' } });
  const latest = await b.evaluate((key) => localStorage.getItem(key), key);
  await a
    .getByRole('button', { name: 'Restore all data', exact: true })
    .click();
  await expect(a.getByRole('dialog').getByRole('alert')).toContainText(
    'Another tab',
  );
  expect(await a.evaluate((key) => localStorage.getItem(key), key)).toBe(
    latest,
  );
});

test('failed restore retains current state and never reports restoration success', async ({
  page,
}) => {
  await page.goto('/');
  const backup = await exported(page);
  await page.getByRole('button', { name: 'Dark mode', exact: true }).click();
  await expectSaved(page, { preferences: { theme: 'dark' } });
  const original = await page.evaluate((key) => localStorage.getItem(key), key);
  await importFile(page, backup);
  await expect(
    page.getByRole('button', { name: 'Restore all data', exact: true }),
  ).toBeEnabled();
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Full', 'QuotaExceededError');
    };
  });
  await page
    .getByRole('button', { name: 'Restore all data', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'could not be saved or verified',
  );
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByText('Backup restored and saved.', { exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    original,
  );
});

test('the unified import dialog switches from JSON preview to CSV without stale restore data', async ({
  page,
}) => {
  await page.goto('/');
  const backup = await exported(page);
  await importFile(page, backup);
  await expect(page.locator('.backup-summary')).toBeVisible();
  await page
    .getByLabel('Choose timetable file', { exact: true })
    .setInputFiles({
      name: 'courses.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        'name,day,start,end,weeks\nCSV replacement,Mon,1,2,1-16',
      ),
    });
  await expect(page.locator('.backup-summary')).toHaveCount(0);
  await expect(page.locator('.preview-table')).toContainText('CSV replacement');
  await page.getByRole('dialog').locator('.button.primary').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expectSaved(page, {
    schedule: { courses: [{ name: 'CSV replacement' }] },
  });
  const after = await exported(page);
  expect(after.schedule.courses).toHaveLength(1);
  expect(after.schedule.courses[0].name).toBe('CSV replacement');
});

test('JSON preview and confirmation remain reachable in all locales and short viewports', async ({
  page,
}) => {
  await page.goto('/');
  const backup = await exported(page);
  for (const locale of ['en', 'zh-Hans', 'zh-Hant']) {
    await page.locator('.language-select').selectOption(locale);
    for (const theme of [0, 1]) {
      await page.locator('.theme-switch button').nth(theme).click();
      await dataManagement(page);
      await page.locator('input[type=file]').setInputFiles({
        name: 'a-long-but-valid-backup-filename.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(backup)),
      });
      await expect(page.locator('.backup-summary')).toBeVisible();
      for (const [width, height] of [
        [1440, 900],
        [393, 650],
        [320, 568],
        [844, 320],
      ]) {
        await page.setViewportSize({ width, height });
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve()),
              ),
            ),
        );
        const confirm = page.getByRole('dialog').locator('.button.primary');
        await confirm.scrollIntoViewIfNeeded();
        await expect(confirm).toBeInViewport();
        expect(
          await page
            .locator('.modal')
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);
        const bounds = await page.locator('.modal').boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      }
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  }
});
