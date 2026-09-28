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

test('phone touch reaches the 3D canvas outside its controls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await declineAnalytics(page);

  const canvas = page.locator('.stage3d-shell canvas');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  const canvasHit = await canvas.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2) === element;
  });
  expect(canvasHit).toBe(true);

  const before = await canvas.screenshot();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
  const x = bounds!.x + bounds!.width / 2;
  const y = bounds!.y + bounds!.height / 2;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 90, y: y + 12 }] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(async () => (await canvas.screenshot()).equals(before)).toBe(false);

  const trigger = page.getByRole('button', { name: '3D display controls' });
  await trigger.click();
  await expect(page.locator('#stage3d-controls-panel')).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Effects' })).toHaveAttribute('aria-checked', 'false');

  await page.getByText('What To Do Next', { exact: true }).click();
  await expect(canvas).toBeVisible();
  await expect(page.getByText('3D stage is temporarily unavailable.')).toBeHidden();
});

test('3D context loss offers a simpler graphics retry', async ({ page }) => {
  await declineAnalytics(page);
  const canvas = page.locator('.stage3d-shell canvas');
  await expect(canvas).toBeVisible();
  const contextLossAvailable = await canvas.evaluate((element) => {
    const extension = (element as HTMLCanvasElement)
      .getContext('webgl2')?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(contextLossAvailable).toBe(true);
  await expect(page.getByText('The browser lost the 3D graphics context.')).toBeVisible();
  await page.getByRole('button', { name: 'Retry with simpler graphics' }).click();
  await expect(canvas).toBeVisible();
  await expect(page.getByText('3D stage is temporarily unavailable.')).toBeHidden();
});
