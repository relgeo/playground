import { devices, expect, test, type Locator, type Page } from '@playwright/test';

test.use({ ...devices['iPhone 13'], browserName: 'chromium' });

async function openPlayground(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
  await expect(page.getByRole('status', { name: /^READY/ })).toBeVisible();
}

async function tapWithTouch(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await locator.page().touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

test('mobile surface switcher responds to touch taps', async ({ page }) => {
  await openPlayground(page);

  const touchState = await page.evaluate(() => ({
    maxTouchPoints: navigator.maxTouchPoints,
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  expect(touchState.maxTouchPoints).toBeGreaterThan(0);
  expect(touchState.width).toBe(390);
  expect(touchState.height).toBeGreaterThan(500);

  const mobileSurfaces = page.getByRole('group', { name: 'Mobile workspace surface' });
  await expect(mobileSurfaces).toBeVisible();

  await tapWithTouch(mobileSurfaces.getByRole('button', { name: 'Source' }));
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Model Preview canvas' })).toBeHidden();

  await tapWithTouch(mobileSurfaces.getByRole('button', { name: 'Preview' }));
  await expect(page.getByRole('region', { name: 'Model Preview canvas' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeHidden();
});
