import { expect, test } from '@playwright/test';

declare global {
  interface Window { watchFrequencies: number[] }
}

test('partitur Web Audio mengikuti ancaman, tiga bus, pause dan pilihan jumpscare', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // Observe the real nodes at the API boundary; oscillator creation, routing and playback stay native.
  await page.addInitScript(() => {
    window.watchFrequencies = [];
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when?: number) {
      window.watchFrequencies.push(this.frequency.value);
      return start.call(this, when);
    };
  });
  await page.goto('/');
  const notes = () => page.evaluate(() => window.watchFrequencies);
  expect(await notes()).toEqual([]);
  await page.locator('#sound').click();
  await expect.poll(notes).toContain(196);
  await page.locator('[data-open=sweeper]').click();
  const dialog = page.locator('dialog.igc-dialog[open]');
  await dialog.locator('.igc-form button[type=submit]').click();
  await dialog.locator('.igc-actions .igc-primary').click();
  await dialog.locator('[data-index="0"]').click();
  await expect(dialog.locator('[data-stat=lives]')).toHaveText('1 / 2');
  await expect.poll(notes).toContain(132);
  // Sweeper's final chance sets threat to .65, shifting its 87.31 Hz pulse.
  await expect.poll(async () => (await notes()).some(hz => Math.abs(hz - 87.31 * 1.013) < .02)).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveAttribute('data-screen','pause');
  const paused = await notes();
  // Longer than one calm-mode beat; a leaked scheduler would have produced more voices.
  await page.waitForTimeout(1450);
  expect(await notes()).toEqual(paused);
  await dialog.getByRole('button',{name:'Settings',exact:true}).click();
  await dialog.locator('select').first().selectOption('full');
  await dialog.locator('.igc-mixer summary').click();
  await dialog.getByRole('slider',{name:'Music',exact:true}).fill('35');
  await dialog.getByRole('slider',{name:'Ambience',exact:true}).fill('40');
  await dialog.getByRole('slider',{name:'Sound effects',exact:true}).fill('55');
  await dialog.getByRole('button',{name:'Save settings'}).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('indoghost.preferences.v1')!));
  expect(saved).toMatchObject({music:.35, ambience:.4, effects:.55, horror:'full'});
  await dialog.getByRole('button',{name:'Resume',exact:true}).click();
  await expect(dialog.locator('[data-stat=lives]')).toHaveText('1 / 2');
  await dialog.locator('[data-index="1"]').click();
  await expect(dialog).toHaveAttribute('data-screen','defeat-effect');
  await expect(dialog.locator('.igc-shadow')).toHaveCSS('animation-name','none');
  await dialog.getByRole('button',{name:'Skip reveal'}).click();
  await expect.poll(notes).toContain(105);
  await dialog.getByRole('button',{name:'Retry night'}).click();
  await expect(dialog.locator('[data-stat=lives]')).toHaveText('2 / 2');
  await page.keyboard.press('Escape');
  await dialog.getByRole('button',{name:'Settings',exact:true}).click();
  await dialog.locator('select').first().selectOption('quiet');
  await dialog.getByRole('button',{name:'Save settings'}).click();
  await dialog.getByRole('button',{name:'Resume',exact:true}).click();
  await dialog.locator('[data-index="0"]').click();
  await dialog.locator('[data-index="1"]').click();
  await expect(dialog).toHaveAttribute('data-screen','defeat');
  expect((await notes()).filter(hz => hz === 105 || hz === 145)).toEqual([105]);
});

test.describe('input sentuh di gang desa', () => {
  test.use({hasTouch:true, viewport:{width:375,height:812}});
  test('tombol arah Phaser mengambil koin, lampion mengubah ancaman dan jeda menyimpan posisi', async ({page}) => {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.goto('/');
    await page.locator('[data-open=chase]').tap();
    const dialog=page.locator('dialog.igc-dialog[open]');
    await dialog.locator('.igc-form button[type=submit]').tap();
    await dialog.locator('.igc-actions .igc-primary').tap();
    await expect(dialog.locator('canvas[role=img]')).toBeVisible();
    const right=dialog.locator('[data-dir=right]'), light=dialog.locator('.chase-lamp');
    for(const target of [right,light]){
      const box=await target.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    await right.tap();
    await expect(dialog.locator('[data-value=coins]')).toHaveText('1 / 5');
    const remaining=Number(await dialog.locator('[data-value=oil]').innerText());
    await light.tap();
    await expect(dialog.locator('[data-value=oil]')).toHaveText(String(remaining-1));
    await expect(dialog.locator('[data-value=threat]')).toHaveAttribute('data-state','ward');
    const position=await dialog.locator('canvas').getAttribute('aria-label');
    await dialog.getByRole('button',{name:'Pause',exact:true}).tap();
    await dialog.getByRole('button',{name:'Resume',exact:true}).tap();
    await expect(dialog.locator('canvas')).toHaveAttribute('aria-label',position!);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.evaluate(()=>localStorage.getItem('indoghost.night.v1.1'))).toBeNull();
  });
});
