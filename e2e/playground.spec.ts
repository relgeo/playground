import { expect, test, type Page } from '@playwright/test';

const runtimeDiagnosticSource = `version: 0.5

meta:
  name: RelGeo v0.5 Runtime Align Diagnostic

objects:
  first:
    type: point
    at: [0, 0]

  second:
    type: point
    at: [10, 10]

constraints:
  - align:
      target: first
      with: second
`;

async function openPlayground(page: Page) {
  await page.goto('./');
  await expect(page.getByRole('textbox', { name: 'RelGeo DSL source editor' })).toBeVisible();
  await expect(page.getByRole('status', { name: /^READY/ })).toBeVisible();
}

test('resolves source, keeps preview visible, and exposes runtime diagnostics', async ({ page }) => {
  await openPlayground(page);

  const editor = page.getByRole('textbox', { name: 'RelGeo DSL source editor' });
  await editor.fill(runtimeDiagnosticSource);

  await expect(page.getByRole('status', { name: /^READY/ })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Model Preview canvas' })).toBeVisible();
  await expect(page.locator('.svg-inner-wrapper svg')).toBeVisible();

  await page.getByRole('tab', { name: 'Errors' }).click();
  await expect(page.getByRole('tab', { name: 'Errors' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Points are not aligned. Distance: 14.1421', { exact: true })).toBeVisible();
});
