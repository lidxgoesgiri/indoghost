import { expect, type Page } from '@playwright/test';
import { test } from './returning-visitor';

// Walks recorded against the original seeded villages. Inputs go through the actual keyboard.
const walks: Record<number, string> = {
  1: ['R', 'RRRUUU', 'LULLLUU', 'UURRRRRR', 'RRRDDDDDDDRRRRD', 'RUUUUUUUU'].join(''),
  3: ['R', 'RRRUU', 'ULLL', 'LUUUU', 'URRRR', 'RRRRRRRRRRDDDDDD', 'UUUUUU'].join(''),
  5: ['R', 'RRRRR', 'RRRUU', 'RDRRRU', 'UUULLLLLUUU', 'LLLLD', 'DDLLLD', 'RRRRRRRRRURRRRUUU'].join(''),
  7: ['R', 'RRUU', 'UULLLU', 'UUURRR', 'RRRRR', 'RDDDLD', 'RRRRRU', 'RDDDDLLD', 'RRUUUUUUUU'].join(''),
};
const keys: Record<string, string> = { R: 'ArrowRight', L: 'ArrowLeft', U: 'ArrowUp', D: 'ArrowDown' };

async function playChase(page: Page, night: number) {
  const canvas = page.locator('.chase-stage canvas');
  await expect(canvas).toBeVisible();
  await canvas.focus();
  for (const dir of walks[night]) {
    const before = await canvas.getAttribute('aria-label');
    const threat = page.locator('[data-value=threat]');
    if (
      (await threat.getAttribute('data-state')) === 'near' &&
      (await page.locator('.chase-lamp').isEnabled())
    ) {
      await page.keyboard.press('Space');
    }
    await page.keyboard.down(keys[dir]);
    try {
      await page.waitForFunction(
        (previous) => {
          const tile = document.querySelector('.chase-stage canvas');
          return !tile || tile.getAttribute('aria-label') !== previous;
        },
        before,
        { timeout: 1800 },
      );
    } finally {
      await page.keyboard.up(keys[dir]);
    }
    if (!(await canvas.count())) break;
  }
}

async function playSweeper(page: Page, night: number) {
  const board = page.locator('.sweep-tile');
  await expect(board.first()).toBeVisible();
  if (night === 2) await page.locator('[data-action=burn]').click();
  // Safest path is independently known for the legacy production floors. Reveal by actual clicks.
  const traps = night === 2 ? [0, 1, 8, 14] : [2, 3, 6, 12, 13];
  const size = await board.count();
  for (let i = 0; i < size; i++) {
    if (traps.includes(i)) continue;
    const tile = page.locator('.sweep-tile[data-index="' + i + '"]');
    if ((await tile.count()) && (await tile.getAttribute('data-state')) === 'closed') await tile.click();
  }
}

test('tujuh malam beruntun dari jurnal kosong sampai epilog dan reload', async ({ page }) => {
  test.setTimeout(170_000);
  const exceptions: string[] = [];
  page.on('pageerror', (e) => exceptions.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => localStorage.getItem('indoghost.night.v1.1'))).toBeNull();
  await page.locator('[data-open=play]').first().click();
  await page.locator('.igc-form input[name=horror][value=quiet]').check();
  await page.locator('.igc-form button[type=submit]').click();
  for (let night = 1; night <= 7; night++) {
    await test.step('Malam ' + night, async () => {
      await expect(page.locator('[data-screen=intro]')).toBeVisible();
      await page.locator('.igc-actions .igc-primary').click();
      if (walks[night]) await playChase(page, night);
      else if (night === 6) {
        for (const move of [1, 2, 5, 4, 7, 'wait', 4, 1, 0]) {
          if (move === 'wait') await page.locator('.ige-control[data-action=wait]').click();
          else await page.locator('.ige-room[data-room="' + move + '"]').click();
        }
      } else await playSweeper(page, night);
      await expect(page.locator('[data-screen=win]')).toBeVisible();
      const record = await page.evaluate(
        (n) => JSON.parse(localStorage.getItem('indoghost.night.v1.' + n) || 'null'),
        night,
      );
      expect(record).toBeTruthy();
      if (night === 2) expect(record).toMatchObject({ flame: -1, clue: 'brass-key' });
      await page.locator('.igc-actions .igc-primary').click();
    });
  }
  await expect(page.locator('[data-screen=ending]')).toContainText('26');
  await page.reload();
  await page.locator('[data-open=play]').first().click();
  await expect(page.locator('[data-screen=ending]')).toBeVisible();
  await page.locator('.igc-actions .igc-primary').click();
  await expect(page.locator('.igc-stats')).toContainText('7 / 7');
  await expect(page.locator('.igc-entries li')).toHaveCount(7);
  await expect(page.locator('.igc-clue')).toHaveCount(3);
  expect(exceptions).toEqual([]);
});
