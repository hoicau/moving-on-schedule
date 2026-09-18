import { expect, test, type CDPSession, type Page } from '@playwright/test';

async function moveTouch(
  client: CDPSession,
  x: number,
  y: number,
  start = false,
) {
  await client.send('Input.dispatchTouchEvent', {
    type: start ? 'touchStart' : 'touchMove',
    touchPoints: [{ x, y }],
  });
}

async function endTouch(client: CDPSession) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
}

async function offset(page: Page, selector: string, axis: 'x' | 'y') {
  return page
    .locator(selector)
    .evaluate(
      (el, axis) =>
        Number.parseFloat(
          (el as HTMLElement).style.getPropertyValue(`--elastic-${axis}`),
        ) || 0,
      axis,
    );
}

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.locator('.timetable')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test('desktop wheel scrolling stays native, even in a narrow window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 700 });
  await ready(page);
  await page.mouse.move(180, 200);
  await page.mouse.wheel(0, -500);
  await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
});

test.describe('bounded mobile feedback', () => {
  test.use({
    viewport: { width: 393, height: 700 },
    isMobile: true,
    hasTouch: true,
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`${theme}: page pull is capped, reverses smoothly, and returns without moving the header`, async ({
      page,
      context,
    }) => {
      await page.emulateMedia({ colorScheme: theme });
      await ready(page);
      const client = await context.newCDPSession(page);
      const header = await page.locator('.topbar').boundingBox();
      const extent = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await moveTouch(client, 180, 180, true);
      await moveTouch(client, 180, 280);
      const first = await offset(page, 'main', 'y');
      expect(first).toBeGreaterThan(0);
      await moveTouch(client, 180, 600);
      const peak = await offset(page, 'main', 'y');
      expect(peak).toBeGreaterThan(first);
      expect(peak).toBeLessThanOrEqual(32);
      await moveTouch(client, 180, 250);
      const reversed = await offset(page, 'main', 'y');
      expect(reversed).toBeGreaterThan(0);
      expect(reversed).toBeLessThan(peak);
      expect(await page.locator('.topbar').boundingBox()).toEqual(header);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      await endTouch(client);
      await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBe(extent);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(393);

      // Dragging back past the origin must scroll without requiring a second touch.
      await moveTouch(client, 180, 180, true);
      await moveTouch(client, 180, 280);
      await moveTouch(client, 180, 120);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
      expect(await offset(page, 'main', 'y')).toBe(0);
      await endTouch(client);
      await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
      await page.evaluate(() => scrollTo(0, 0));

      await page.evaluate(() =>
        scrollTo(0, document.documentElement.scrollHeight),
      );
      const bottom = await page.evaluate(() => scrollY);
      await moveTouch(client, 180, 570, true);
      await moveTouch(client, 180, 150);
      expect(await offset(page, 'main', 'y')).toBeLessThan(0);
      expect(await offset(page, 'main', 'y')).toBeGreaterThanOrEqual(-32);
      await endTouch(client);
      await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
      expect(await page.evaluate(() => scrollY)).toBe(bottom);

      // Leave the native swipe until last so its inertia cannot race scrollTo.
      await page.evaluate(() => scrollTo(0, 0));
      await moveTouch(client, 180, 300, true);
      await moveTouch(client, 180, 180);
      await endTouch(client);
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
      await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
    });
  }

  test('timetable edges stay within 24px and vertical gestures still reach the page', async ({
    page,
    context,
  }) => {
    await ready(page);
    const client = await context.newCDPSession(page);
    const table = page.locator('.timetable-scroll');
    await table.scrollIntoViewIfNeeded();
    const bounds = (await table.boundingBox())!;
    const y = Math.max(100, Math.min(550, bounds.y + 80));
    const pageY = await page.evaluate(() => scrollY);
    await moveTouch(client, 100, y, true);
    await moveTouch(client, 350, y);
    expect(await offset(page, '.timetable-scroll', 'x')).toBeGreaterThan(0);
    expect(await offset(page, '.timetable-scroll', 'x')).toBeLessThanOrEqual(
      24,
    );
    expect(await table.evaluate((el) => el.scrollLeft)).toBe(0);
    expect(await page.evaluate(() => scrollY)).toBe(pageY);
    await endTouch(client);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);

    await table.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    const end = await table.evaluate((el) => el.scrollLeft);
    await moveTouch(client, 350, y, true);
    await moveTouch(client, 60, y);
    expect(await offset(page, '.timetable-scroll', 'x')).toBeLessThan(0);
    expect(await offset(page, '.timetable-scroll', 'x')).toBeGreaterThanOrEqual(
      -24,
    );
    await endTouch(client);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
    expect(await table.evaluate((el) => el.scrollLeft)).toBe(end);

    await moveTouch(client, 200, y + 40, true);
    await moveTouch(client, 200, y - 60);
    await endTouch(client);
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeGreaterThan(pageY);
  });

  test('Coming up keeps its scroll position during feedback and restores snapping', async ({
    page,
    context,
  }) => {
    await page.clock.setFixedTime(new Date('2026-09-14T07:00:00+08:00'));
    await ready(page);
    const client = await context.newCDPSession(page);
    const entries = page.locator('.upcoming-entries');
    await entries.scrollIntoViewIfNeeded();
    const bounds = (await entries.boundingBox())!;
    const y = bounds.y + 50;
    for (const edge of ['start', 'end']) {
      await entries.evaluate((el, edge) => {
        el.scrollLeft = edge === 'start' ? 0 : el.scrollWidth;
      }, edge);
      const initial = await entries.evaluate((el) => el.scrollLeft);
      await moveTouch(client, edge === 'start' ? 80 : 350, y, true);
      await moveTouch(client, edge === 'start' ? 350 : 80, y);
      const distance = await offset(page, '.upcoming-entries', 'x');
      expect(Math.abs(distance)).toBeGreaterThan(0);
      expect(Math.abs(distance)).toBeLessThanOrEqual(24);
      expect(await entries.evaluate((el) => el.scrollLeft)).toBe(initial);
      await endTouch(client);
      await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
      expect(await entries.evaluate((el) => el.scrollLeft)).toBe(initial);
      await expect(entries).toHaveCSS('scroll-snap-type', 'x mandatory');
    }
    await entries.evaluate((el) => {
      el.scrollLeft = 0;
    });
    await moveTouch(client, 180, y, true);
    await moveTouch(client, 280, y);
    await moveTouch(client, 120, y);
    expect(await entries.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
    expect(await offset(page, '.upcoming-entries', 'x')).toBe(0);
    await endTouch(client);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
    await expect(entries).toHaveCSS('scroll-snap-type', 'x mandatory');
  });

  test('short sidebar and modal contain the effect without moving the page', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 393, height: 500 });
    await ready(page);
    const client = await context.newCDPSession(page);
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveClass(/open/);
    await expect
      .poll(async () => Math.round((await sidebar.boundingBox())!.x))
      .toBe(0);
    await moveTouch(client, 110, 80, true);
    await moveTouch(client, 110, 380);
    expect(await offset(page, '.sidebar', 'y')).toBeGreaterThan(0);
    expect(await offset(page, '.sidebar', 'y')).toBeLessThanOrEqual(24);
    await endTouch(client);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Timetable settings', exact: true })
      .click();
    const modal = page.locator('.modal');
    await modal.evaluate((el) => {
      el.scrollTop = 0;
    });
    const pageY = await page.evaluate(() => scrollY);
    const modalBounds = (await modal.boundingBox())!;
    const y = modalBounds.y + 40;
    await moveTouch(client, 180, y, true);
    await moveTouch(client, 180, y + 250);
    expect(await offset(page, '.modal', 'y')).toBeGreaterThan(0);
    expect(await offset(page, '.modal', 'y')).toBeLessThanOrEqual(24);
    expect(await page.evaluate(() => scrollY)).toBe(pageY);
    expect(await offset(page, 'main', 'y')).toBe(0);
    await endTouch(client);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
  });

  test('reduced motion and multi-touch bypass feedback', async ({
    page,
    context,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await ready(page);
    const client = await context.newCDPSession(page);
    await moveTouch(client, 180, 180, true);
    await moveTouch(client, 180, 400);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
    await endTouch(client);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await moveTouch(client, 180, 180, true);
    await moveTouch(client, 180, 300);
    await expect(page.locator('[data-elastic-state]')).toHaveCount(1);
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: 180, y: 300, id: 0 },
        { x: 260, y: 300, id: 1 },
      ],
    });
    await expect(page.locator('[data-elastic-state]')).toHaveCount(0);
    await endTouch(client);
  });
});
