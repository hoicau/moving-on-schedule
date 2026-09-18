import { expect, test } from '@playwright/test';

test('daily times accept single-digit hours and persist normalized values', async ({
  page,
}) => {
  await page.goto('/');
  const openSettings = page.getByRole('button', {
    name: 'Timetable settings',
    exact: true,
  });
  await openSettings.click();
  const start = page.getByRole('textbox', {
    name: 'Period 1 start time',
    exact: true,
  });
  const end = page.getByRole('textbox', {
    name: 'Period 1 end time',
    exact: true,
  });
  const save = page.getByRole('button', { name: 'Save settings', exact: true });

  await start.fill('8:60');
  await end.fill('10:00');
  await save.click();
  await expect(page.getByRole('alert')).toBeVisible();

  await start.fill('8:00');
  await end.fill('7:59');
  await save.click();
  await expect(page.getByRole('alert')).toBeVisible();

  await end.fill('10:00');
  await page
    .getByRole('textbox', { name: 'Period 2 start time', exact: true })
    .fill('9:00');
  await save.click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page
    .getByRole('textbox', { name: 'Period 2 start time', exact: true })
    .fill('');
  await save.click();
  await expect(page.locator('.settings-modal')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = localStorage.getItem('moving-on-schedule.data');
        return saved
          ? JSON.parse(saved).data.schedule.settings.periods[0]
          : null;
      }),
    )
    .toEqual({ start: '08:00', end: '10:00' });
  await page.reload();
  await openSettings.click();
  await expect(start).toHaveValue('08:00');
  await expect(end).toHaveValue('10:00');
  await expect(
    page.getByRole('textbox', { name: 'Period 2 start time', exact: true }),
  ).toHaveValue('');

  await start.fill('0:00');
  await end.fill('9:05');
  await save.click();
  await expect(page.locator('.settings-modal')).toHaveCount(0);
  await openSettings.click();
  await expect(start).toHaveValue('00:00');
  await expect(end).toHaveValue('09:05');
});
