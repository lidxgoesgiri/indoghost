import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const hero = '**/assets/kalisepi.webp';
const enter = (page: Page) => page.locator('[data-opening-enter]');
const opening = (page: Page) => page.locator('[data-opening]');
const progress = (page: Page) => opening(page).getByRole('progressbar');

// Intercept before navigation so neither HTML preload nor CSS can race the test.
// Continuing the real request also exercises decoding, font readiness, and cache reuse.
async function holdAsset(page: Page, pattern: string | RegExp) {
  let unblock!: () => void;
  const gate = new Promise<void>((resolve) => { unblock = resolve; });
  await page.route(pattern, async (route) => {
    await gate;
    await route.continue();
  });
  return unblock;
}

test('entry JavaScript tertahan: layar HTML menawarkan pemulihan sampai aplikasi siap', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const release = await holdAsset(page, /\/(?:assets\/index-[^/]+\.js|src\/main\.tsx)(?:\?.*)?$/);
  try {
    // Module execution delays DOMContentLoaded, so inspect the HTML on navigation commit.
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.locator('#boot-mark strong')).toBeVisible();
    await expect(page.locator('#boot-mark strong')).toHaveText('INDOGHOST');
    await expect(opening(page)).toHaveCount(0);
    await expect(page.locator('#boot-retry')).toBeVisible({ timeout: 12_000 });
    release();
    await expect(enter(page)).toBeEnabled();
    await expect(page.locator('#boot-mark')).toHaveCount(0);
  } finally {
    release();
  }
});

test('satu gesture menyelesaikan transisi saat jam animasi berhenti dan mengembalikan fokus ke desa', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const nextFrame = window.requestAnimationFrame.bind(window);
    let interrupted = false;
    const waiting: FrameRequestCallback[] = [];
    window.openingInterruptedFrames = 0;
    // Hold animation frames only during handoff. DOM timers and keyboard events stay native.
    window.requestAnimationFrame = (callback) => nextFrame((time) => {
      if (interrupted) {
        waiting.push(callback);
        window.openingInterruptedFrames++;
      } else callback(time);
    });
    document.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-opening-enter]')) return;
      interrupted = true;
      const observer = new MutationObserver(() => {
        if (document.querySelector('[data-opening]')) return;
        observer.disconnect();
        interrupted = false;
        for (const callback of waiting.splice(0)) nextFrame(callback);
      });
      observer.observe(document.documentElement, { subtree: true, childList: true });
    }, { capture: true });
  });
  await page.goto('/');
  await expect(enter(page)).toBeEnabled();
  await enter(page).click();
  await expect(opening(page)).toHaveAttribute('data-phase', 'entering');
  await expect(opening(page)).toHaveCount(0);
  expect(await page.evaluate(() => window.openingInterruptedFrames)).toBeGreaterThan(0);
  await expect(page.locator('#village')).toBeFocused();
  await expect(page.locator('[data-story]')).toHaveAttribute('data-suspended', 'false');
  await page.locator('[data-story] [data-open=play]').click();
  await expect(page.locator('[data-screen=gate]')).toBeVisible();
});

test('cache kosong: persentase mengikuti aset yang benar-benar selesai', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const releaseHero = await holdAsset(page, hero);
  const releaseKayon = await holdAsset(page, '**/assets/kayon.svg');
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(opening(page)).toBeVisible();
    // Only the three local font faces are available while both images are held.
    await expect(progress(page)).toHaveAttribute('aria-valuenow', '60');
    await expect(enter(page)).not.toBeEnabled();
    releaseKayon();
    await expect(progress(page)).toHaveAttribute('aria-valuenow', '80');
    await expect(enter(page)).not.toBeEnabled();
    releaseHero();
    await expect(progress(page)).toHaveAttribute('aria-valuenow', '100');
    await expect(opening(page).getByRole('button', { name: /^enter the village$/i })).toBeEnabled();
  } finally {
    releaseKayon();
    releaseHero();
  }
});

test('keyboard, reload, navigasi dan sesi baru menjaga pembuka serta jurnal secara terpisah', async ({
  page, browser, context, baseURL,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const record = JSON.stringify({ coins: 5, flame: 2 });
  await page.goto('/');
  await expect(enter(page)).toBeEnabled();
  await page.evaluate((saved) => localStorage.setItem('indoghost.night.v1.1', saved), record);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const audit = await new AxeBuilder({ page }).include('[data-opening]')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(audit.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map((node) => node.target) }))).toEqual([]);

  await enter(page).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(opening(page).locator('[data-opening-audio]')).toBeFocused();
  for (let i = 0; i < 8; i++) {
    if (await enter(page).evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
    expect(await page.locator('header :focus, main :focus').count()).toBe(0);
  }
  await expect(enter(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(opening(page)).toHaveCount(0);
  await expect(page.locator('#village')).toBeFocused();
  await expect(page.locator('[data-story]')).toHaveAttribute('data-motion', 'reduced');
  await page.locator('header [data-open=journal]').click();
  await expect(page.locator('.igc-stats')).toContainText('1 / 7');
  await page.keyboard.press('Escape');
  await page.goto('/#encounters');
  await expect(page.locator('#encounters')).toBeInViewport();
  await expect(opening(page)).toHaveCount(0);
  await page.goBack();
  await expect(page.locator('[data-story]')).toBeVisible();
  await expect(opening(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#guide-open')).toBeVisible();
  await expect(opening(page)).toHaveCount(0);

  // Copy durable browser data, excluding sessionStorage, just as a new session does.
  const fresh = await browser.newContext({
    baseURL, reducedMotion: 'reduce', storageState: await context.storageState(),
  });
  try {
    const next = await fresh.newPage();
    await next.goto('/');
    await expect(opening(next)).toBeVisible();
    await expect(enter(next)).toBeEnabled();
    expect(await next.evaluate(() => localStorage.getItem('indoghost.night.v1.1'))).toBe(record);
  } finally {
    await fresh.close();
  }
});

test('tautan langsung dan reload tetap bekerja saat penyimpanan sesi ditolak', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => Object.defineProperty(window, 'sessionStorage', {
    get() { throw new DOMException('Penyimpanan sesi ditolak', 'SecurityError'); },
  }));
  await page.goto('/#encounters');
  await expect(enter(page)).toBeEnabled();
  await enter(page).click();
  await expect(opening(page)).toHaveCount(0);
  await expect(page.locator('#encounters')).toBeFocused();
  await expect(page.locator('#encounters')).toBeInViewport();
  await page.reload();
  await expect(page.locator('#encounters [data-open=escape]')).toBeVisible();
  await expect(opening(page)).toHaveCount(0);
});

test('jaringan macet: Escape melewati antrean dan melepas fokus serta kunci gulir', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const release = await holdAsset(page, hero);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(progress(page)).toHaveAttribute('aria-valuenow', '80');
    await expect(opening(page).locator('[data-opening-skip]')).toBeEnabled();
    await page.mouse.wheel(0, 480);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await page.keyboard.press('Escape');
    await expect(opening(page)).toHaveCount(0);
    await expect(page.locator('#village')).toBeFocused();
    // Deliver the pending image after unmount and verify that it cannot reopen the dialog.
    release();
    await page.waitForLoadState('load');
    await page.mouse.wheel(0, 650);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await expect(opening(page)).toHaveCount(0);
    await page.locator('#encounters [data-open=sweeper]').click();
    await expect(page.locator('[data-screen=gate]')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test('aset penting gagal dan WebGL tidak tersedia: pengunjung masih dapat masuk dan bermain', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route(hero, (route) => route.fulfill({ status: 404, body: 'Aset tidak tersedia' }));
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, name: string, ...args: unknown[]) {
        return name.includes('webgl') ? null : Reflect.apply(getContext, this, [name, ...args]);
      },
    });
  });
  await page.goto('/');
  await expect(opening(page)).toBeVisible();
  await expect(progress(page)).toHaveAttribute('aria-valuenow', '80');
  await expect(enter(page)).toBeEnabled();
  await enter(page).click();
  await expect(opening(page)).toHaveCount(0);
  await expect(page.locator('[data-story]')).toHaveAttribute('data-renderer', 'fallback');
  await page.locator('[data-story] [data-open=play]').click();
  await expect(page.locator('[data-screen=gate]')).toBeVisible();
});

declare global {
  interface Window {
    openingInterruptedFrames: number;
    openingAudioContexts: AudioContext[];
    openingAudioGestures: boolean[];
  }
}

for (const savedSound of [false, true]) {
  test(`audio saat masuk menghormati pilihan pengunjung dengan preferensi awal ${savedSound ? 'aktif' : 'mati'}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((enabled) => {
      localStorage.setItem('indoghost.preferences.v1', JSON.stringify({
        lang: 'id', horror: 'quiet', consent: true, level: 0.55, reducedMotion: true, sound: enabled,
      }));
      window.openingAudioContexts = [];
      window.openingAudioGestures = [];
      window.AudioContext = new Proxy(window.AudioContext, {
        construct(target, args) {
          const context = Reflect.construct(target, args) as AudioContext;
          window.openingAudioContexts.push(context);
          window.openingAudioGestures.push(navigator.userActivation.isActive);
          return context;
        },
      });
    }, savedSound);
    await page.goto('/');
    await expect(enter(page)).toBeEnabled();
    expect(await page.evaluate(() => window.openingAudioContexts.length)).toBe(0);
    await opening(page).locator('[data-opening-audio]').click();
    expect(await page.evaluate(() => window.openingAudioContexts.length)).toBe(0);
    await enter(page).click();
    await expect(opening(page)).toHaveCount(0);
    await expect(page.locator('#sound')).toHaveAttribute('aria-pressed', String(!savedSound));
    if (savedSound) {
      expect(await page.evaluate(() => window.openingAudioContexts.length)).toBe(0);
    } else {
      await expect.poll(() => page.evaluate(() => window.openingAudioContexts.map((audio) => audio.state)))
        .toContain('running');
      expect(await page.evaluate(() => window.openingAudioGestures)).toEqual([true]);
    }
  });
}
