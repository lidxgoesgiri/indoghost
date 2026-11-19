import { expect, test, type Locator, type Page } from '@playwright/test';

// Only this browser worker needs a predictable software WebGL backend.
test.use({ launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

async function enterGame(page: Page, trigger: Locator) {
  await trigger.click();
  await expect(page.locator('[data-screen=gate]')).toBeVisible();
  await page.locator('.igc-form input[name=horror][value=quiet]').check();
  await page.locator('.igc-form button[type=submit]').click();
  await expect(page.locator('[data-screen=intro]')).toBeVisible();
  await page.locator('.igc-actions .igc-primary').click();
  await expect(page.locator('[data-screen=game]')).toBeVisible();
}

async function expectPosterFallback(page: Page) {
  const story = page.locator('[data-story]');
  // The initial loading poster is transient. Wait for the actual fallback state.
  await expect(story).toHaveAttribute('data-renderer', 'fallback', { timeout: 20_000 });
  await expect(story.locator('.story-canvas canvas')).toHaveCount(0);
  await expect(story.locator('.story-plate').first()).toBeVisible();
  await expect(story.locator('[data-open=play]')).toBeEnabled();
}

test('narasi mengikuti scroll maju dan mundur serta memberi akses langsung ke ronda', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const story = page.locator('[data-story]');
  await expect(story).toHaveAttribute('data-chapter', '0');
  await expect(story).toHaveAttribute('data-motion', 'full');
  async function go(fraction: number) {
    await story.evaluate((node, value) => {
      const top = scrollY + node.getBoundingClientRect().top;
      window.scrollTo(0, top + (node.getBoundingClientRect().height - innerHeight) * value);
    }, fraction);
  }
  await go(0.74);
  await expect(story).not.toHaveAttribute('data-chapter', '0');
  await go(0.99);
  await expect(story).toHaveAttribute('data-chapter', '3');
  await go(0);
  await expect(story).toHaveAttribute('data-chapter', '0');
  await story.locator('[data-open=play]').first().click();
  await expect(page.locator('[data-screen=gate]')).toBeVisible();
  await expect(story).toHaveAttribute('data-suspended', 'true');
});

test('tanpa WebGL adegan dan kampanye tetap dapat diakses', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type.includes('webgl')) return null;
        return Reflect.apply(original, this, [type, ...rest]);
      },
    });
  });
  await page.goto('/');
  await expectPosterFallback(page);
  await page.locator('[data-story-skip]').first().click();
  await expect(page.locator('#encounters')).toBeInViewport();
  await enterGame(page, page.locator('#encounters [data-open=escape]'));
  await page.locator('.ige-room[data-room="1"]').click();
  await expect(page.locator('.ige-room.is-here')).toHaveAttribute('data-room', '1');
});

test.describe('renderer sinematik nyata', () => {
  test.use({ viewport: { width: 720, height: 540 }, reducedMotion: 'no-preference' });

  test('kehilangan konteks WebGL setelah adegan digambar tetap memperbolehkan mulai ronda', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const draw = WebGL2RenderingContext.prototype.drawElements;
      WebGL2RenderingContext.prototype.drawElements = function (...args) {
        const result = draw.apply(this, args);
        const canvas = this.canvas;
        if (canvas instanceof HTMLCanvasElement && canvas.closest('.story-canvas')) {
          canvas.dataset.observedDraws = String(Number(canvas.dataset.observedDraws || 0) + 1);
        }
        return result;
      };
    });
    await page.goto('/');
    const story = page.locator('[data-story]');
    await expect(story).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 });
    const canvas = story.locator('.story-canvas canvas[data-observed-draws]');
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    const lost = await canvas.evaluate(async (node) => {
      const gl = (node as HTMLCanvasElement).getContext('webgl2');
      if (!gl) throw new Error('WebGL2 context missing on rendered story');
      const ext = gl.getExtension('WEBGL_lose_context');
      if (!ext) throw new Error('This Chromium build cannot exercise real context loss');
      const event = new Promise<boolean>((resolve) => {
        node.addEventListener('webglcontextlost', () => resolve(gl.isContextLost()), { once: true });
      });
      ext.loseContext();
      return event;
    });
    expect(lost).toBe(true);
    await expectPosterFallback(page);
    await enterGame(page, story.locator('[data-open=play]'));
    const gameMap = page.locator('.chase-stage canvas[role=img]');
    await expect(gameMap).toBeVisible();
    await gameMap.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-value=coins]')).toHaveText('1 / 5');
  });

  test('gagal memuat chunk FieldScene mempertahankan menu dan teka-teki yang dapat dimainkan', async ({
    page,
  }) => {
    let failedImports = 0;
    await page.route(/\/assets\/FieldScene-[^/]+\.js(?:\?.*)?$/, async (route) => {
      failedImports++;
      await route.abort('failed');
    });
    await page.goto('/');
    await expect.poll(() => failedImports, { timeout: 15_000 }).toBeGreaterThan(0);
    await expectPosterFallback(page);
    await page.locator('[data-story-skip]').click();
    await enterGame(page, page.locator('#encounters [data-open=sweeper]'));
    const tile = page.locator('.sweep-tile[data-index="5"]');
    await expect(tile).toHaveAttribute('data-state', 'closed');
    await tile.click();
    await expect(tile).toHaveAttribute('data-state', 'digit');
  });
});

test('keyboard di lanskap pendek mencapai bab, CTA, dan pilihan permainan', async ({ page }) => {
  await page.setViewportSize({ width: 812, height: 375 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const story = page.locator('[data-story]');
  const play = story.locator('[data-open=play]');
  const step = story.locator('[data-story-step="2"]');
  async function tabTo(target: Locator) {
    for (let i = 0; i < 24; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await expect(target).toBeFocused();
    await expect(target).toBeInViewport({ ratio: 0.95 });
  }
  await tabTo(play);
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-screen=gate]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(play).toBeFocused();
  await tabTo(step);
  await page.keyboard.press('Enter');
  await expect(story).toHaveAttribute('data-chapter', '2');
  await tabTo(story.locator('[data-story-skip]'));
  await page.keyboard.press('Enter');
  const choices = page.locator('#encounters');
  await expect(choices).toBeFocused();
  await tabTo(choices.locator('[data-open=chase]'));
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-screen=gate]')).toBeVisible();
});
