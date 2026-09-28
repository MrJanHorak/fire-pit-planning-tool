import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

async function expectNoWcagViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const violations = results.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
  }));
  expect(violations, `${label} accessibility violations`).toEqual([]);
}

test('designer and build plan have no automated WCAG A/AA violations in either theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline Analytics' }).click();

  for (const theme of ['light', 'dark'] as const) {
    if (theme === 'dark') {
      await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    }
    for (const view of ['designer', 'build plan'] as const) {
      await page.getByRole('tab', { name: view === 'designer' ? '3D Preview' : 'Build Plan' }).click();
      if (view === 'build plan') {
        await expect(page.getByRole('button', { name: 'Download Planning Packet' })).toBeVisible();
      }
      await expectNoWcagViolations(page, `${theme} ${view}`);
      if (view === 'build plan') {
        for (const section of ['Cuts', 'Site Guidance']) {
          await page.getByRole('tab', { name: section }).click();
          await expectNoWcagViolations(page, `${theme} ${section}`);
        }
      }
    }
  }
});

test('phone preview settings have no automated WCAG A/AA violations', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline Analytics' }).click();
  await page.getByRole('button', { name: '3D display controls' }).click();
  await expect(page.locator('#stage3d-controls-panel')).toBeVisible();

  await expectNoWcagViolations(page, 'phone preview settings');
});

test('core controls remain usable with root font size at 200 percent', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline Analytics' }).click();
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });

  const diameter = page.getByRole('spinbutton', { name: 'Inner Diameter in inches' });
  await expect(diameter).toBeVisible();
  await diameter.fill('40');
  await diameter.blur();
  await expect(diameter).toHaveValue('40');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(768);
});

test('view and build-plan tabs support arrow, Home, End, and Enter keys', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline Analytics' }).click();

  const preview = page.getByRole('tab', { name: '3D Preview' });
  const build = page.getByRole('tab', { name: 'Build Plan' });
  await preview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(build).toBeFocused();
  await expect(preview).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(build).toHaveAttribute('aria-selected', 'true');

  const layout = page.getByRole('tab', { name: 'Course Layout' });
  const cuts = page.getByRole('tab', { name: 'Cuts' });
  const site = page.getByRole('tab', { name: 'Site Guidance' });
  await layout.focus();
  await page.keyboard.press('ArrowRight');
  await expect(cuts).toBeFocused();
  await page.keyboard.press('End');
  await expect(site).toBeFocused();
  await page.keyboard.press('Home');
  await expect(layout).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(site).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(site).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Site Guidance' })).toBeVisible();
});

test('enlarged cut detail keeps and restores keyboard focus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Decline Analytics' }).click();
  await page.getByRole('tab', { name: 'Build Plan' }).click();
  await page.getByRole('tab', { name: 'Cuts' }).click();

  const expand = page.getByRole('button', { name: 'Expand' }).last();
  await expand.click();
  const dialog = page.getByRole('dialog', { name: 'Capstone Placement Detail' });
  await expect(dialog).toBeVisible();
  await expectNoWcagViolations(page, 'enlarged cut detail');
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('region', { name: 'Enlarged cut detail diagram' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(expand).toBeFocused();
});
