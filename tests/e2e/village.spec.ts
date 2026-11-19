import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function checkA11y(page: Page) {
  const report = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(report.violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => n.target) }))).toEqual([]);
}

test('panduan, fokus, ganti bahasa dan pengaturan suara', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  const guide = page.getByRole('button', { name: /how to play/i }).first();
  await guide.click();
  await expect(page.locator('#guide')).toBeVisible();
  await checkA11y(page);
  await page.keyboard.press('Escape');
  await expect(guide).toBeFocused();
  await page.locator('#sound').click();
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#sound').click();
  await page.locator('#language').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', 'false');
});

for (const [width, height] of [
  [320, 720],
  [375, 812],
  [768, 1024],
  [1440, 900],
]) {
  test('navigasi dan peta dapat digunakan pada lebar ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'IndoGhost', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 375) await checkA11y(page);
    await page.locator('header [data-open=map]').click();
    await expect(page.locator('.igc-map-pin')).toHaveCount(7);
    await expect(page.locator('button.igc-map-pin')).toHaveCount(1);
    await page.locator('button.igc-map-pin').click();
    await expect(page.locator('[data-screen=gate]')).toBeVisible();
    expect(await page.locator('dialog[open]').evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  });
}

test('save HTTP v1 dan rekaman rusak pulih sampai malam terakhir yang utuh', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'indoghost.preferences.v1',
      JSON.stringify({
        lang: 'id',
        sound: false,
        horror: 'quiet',
        reducedMotion: true,
        consent: true,
        level: 0.35,
      }),
    );
    localStorage.setItem('indoghost.night.v1.1', JSON.stringify({ coins: 5, flame: 2 }));
    localStorage.setItem('indoghost.night.v1.2', '{rusak');
  });
  await page.goto('/');
  await page.locator('header [data-open=journal]').click();
  await expect(page.locator('.igc-stats')).toContainText('1 / 7');
  await expect(page.locator('.igc-notice')).toContainText(/jurnal|malam/i);
  await page.locator('.igc-actions .igc-primary').click();
  await expect(page.locator('[data-screen=intro]')).toContainText('Tuyul Sweeper');
});

test('storage yang diblokir tetap mengizinkan satu sesi permainan', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    }),
  );
  await page.goto('/');
  await page.locator('[data-open=play]').first().click();
  await expect(page.locator('.igc-notice')).toContainText(/storage|visit|session/i);
  await page.locator('.igc-form button[type=submit]').click();
  await page.locator('.igc-actions .igc-primary').click();
  await expect(page.locator('.chase-stage canvas')).toBeVisible();
});

for (const intensity of ['quiet', 'balanced', 'full']) {
  test('kalah, scare, skip dan retry pada intensitas ' + intensity, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('#encounters [data-open=sweeper]').click();
    await page.locator('.igc-form select').first().selectOption(intensity);
    await page.locator('.igc-form button[type=submit]').click();
    await page.locator('.igc-actions .igc-primary').click();
    await page.locator('.sweep-tile[data-index="0"]').click();
    await page.locator('.sweep-tile[data-index="1"]').click();
    if (intensity !== 'quiet') {
      await expect(page.locator('[data-screen=defeat-effect]')).toBeVisible();
      await page.getByRole('button', { name: /skip/i }).click();
    } else await expect(page.locator('.igc-shadow')).toHaveCount(0);
    await expect(page.locator('[data-screen=defeat]')).toBeVisible();
    await page.locator('.igc-actions .igc-primary').click();
    await expect(page.locator('.sweep-tile[data-state=caught]')).toHaveCount(0);
    await expect(page.locator('.sweep-tile')).toHaveCount(20);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-screen=pause]')).toBeVisible();
    await page.locator('.igc-actions .igc-primary').click();
    await expect(page.locator('[data-screen=game]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('indoghost.night.v1.1'))).toBeNull();
  });
}
