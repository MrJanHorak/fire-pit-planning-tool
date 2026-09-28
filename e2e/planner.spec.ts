import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

async function declineAnalytics(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline Analytics' }).click();
}

test('design inputs autosave and the build plan remains available', async ({ page }) => {
  await declineAnalytics(page);
  const diameter = page.getByRole('spinbutton', { name: 'Inner Diameter in inches' });
  await diameter.fill('42');
  await diameter.blur();
  await expect(diameter).toHaveValue('42');

  await expect.poll(async () => page.evaluate(() => localStorage.length)).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Inner Diameter in inches' })).toHaveValue('42');

  await page.getByRole('tab', { name: 'Build Plan' }).click();
  await expect(page.getByRole('button', { name: 'Design Planning Report PDF' })).toBeVisible();
  const packetPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download Planning Packet' }).click();
  const packet = await packetPromise;
  const packetHtml = await readFile(await packet.path(), 'utf8');
  expect(packetHtml).toContain('42.00 in x 42.00 in inner dimensions');
});

test('a downloaded project restores its name and dimensions', async ({ page }) => {
  await declineAnalytics(page);
  await page.getByRole('button', { name: 'Project File' }).click();
  await page.getByRole('textbox', { name: 'Project Name' }).fill('Release gate example');
  const diameter = page.getByRole('spinbutton', { name: 'Inner Diameter in inches' });
  await diameter.fill('42');
  await diameter.blur();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Project JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^release-gate-example-.*\.json$/);

  await diameter.fill('50');
  await diameter.blur();
  await expect(diameter).toHaveValue('50');
  await page.getByRole('button', { name: 'Project File' }).click();
  await page.getByLabel('Import project JSON').setInputFiles(await download.path());

  await expect(page.getByRole('spinbutton', { name: 'Inner Diameter in inches' })).toHaveValue('42');
  await page.getByRole('button', { name: 'Project File' }).click();
  await expect(page.getByRole('textbox', { name: 'Project Name' })).toHaveValue('Release gate example');
});

test('phone view fits and preview settings dismiss by keyboard and outside click', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await declineAnalytics(page);
  await expect.poll(async () => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  const trigger = page.getByRole('button', { name: '3D display controls' });
  const panel = page.locator('#stage3d-controls-panel');
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.getByRole('heading', { name: 'Design Inputs' }).click();
  await expect(panel).toBeHidden();
});
