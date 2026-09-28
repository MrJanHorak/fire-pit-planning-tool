import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

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
      const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
      const violations = results.violations.map(({ id, impact, nodes }) => ({
        id,
        impact,
        nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
      }));
      expect(violations, `${theme} ${view} accessibility violations`).toEqual([]);
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

  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  const violations = results.violations.map(({ id, impact, nodes }) => ({
    id,
    impact,
    nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
  }));
  expect(violations).toEqual([]);
});
