import path from 'node:path';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

test('salinan dari index.html lama bisa diimpor ke jurnal web', async ({ browser }) => {
  const fileUrl = pathToFileURL(path.resolve('index.html')).href;
  const fileContext = await browser.newContext({ locale: 'id-ID', acceptDownloads: true });
  const webContext = await browser.newContext({
    locale: 'id-ID',
    reducedMotion: 'reduce',
    baseURL: 'http://127.0.0.1:4185',
  });
  try {
    const oldPage = await fileContext.newPage();
    await oldPage.addInitScript(() => {
      localStorage.setItem('indoghost.night.v1.1', JSON.stringify({ coins: 5, flame: 2 }));
      localStorage.setItem(
        'indoghost.night.v1.2',
        JSON.stringify({ coins: 0, flame: -1, clue: 'brass-key' }),
      );
      localStorage.setItem(
        'indoghost.preferences.v1',
        JSON.stringify({
          lang: 'id',
          horror: 'quiet',
          reducedMotion: true,
          consent: true,
          sound: false,
          level: 0.4,
        }),
      );
    });
    await oldPage.goto(fileUrl);
    const downloadEvent = oldPage.waitForEvent('download');
    await oldPage.getByRole('button', { name: 'Unduh jurnal lama' }).click();
    const download = await downloadEvent;
    const file = await download.path();
    expect(file).toBeTruthy();
    const data = await fs.readFile(file!);
    expect(JSON.parse(data.toString())).toMatchObject({
      format: 'indoghost-v1',
      nights: [
        { coins: 5, flame: 2 },
        { coins: 0, flame: -1, clue: 'brass-key' },
      ],
    });
    const page = await webContext.newPage();
    await page.goto('/');
    await page.locator('header [data-open=journal]').click();
    await page.locator('.igc-restore summary').click();
    await page
      .locator('dialog input[type=file]')
      .setInputFiles({ name: 'jurnal.json', mimeType: 'application/json', buffer: data });
    const apply = page.getByRole('button', {
      name: /konfirmasi impor|impor sekarang|gabungkan|confirm import|merge/i,
    });
    await apply.click();
    await expect
      .poll(() =>
        page.evaluate(() => JSON.parse(localStorage.getItem('indoghost.night.v1.2') || 'null')?.clue),
      )
      .toBe('brass-key');
    await page.reload();
    await page.locator('header [data-open=journal]').click();
    await expect(page.locator('.igc-stats')).toContainText('2 / 7');
    await expect(page.locator('.igc-entries')).toContainText('Kunci kuningan');
  } finally {
    await webContext.close();
    await fileContext.close();
  }
});
