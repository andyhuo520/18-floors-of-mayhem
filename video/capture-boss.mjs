import {chromium} from 'playwright';
import {copyFile, mkdir} from 'node:fs/promises';
import path from 'node:path';

const out = path.resolve('raw');
await mkdir(out, {recursive: true});
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 1280, height: 720},
  recordVideo: {dir: out, size: {width: 1280, height: 720}},
});
const page = await context.newPage();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  await page.goto('http://localhost:3181/trials.html', {waitUntil: 'domcontentloaded'});
  await page.locator('#companion').check();
  await page.locator('#start').click();
  await pause(1000);
  for (const [key, ms] of [
    ['KeyJ', 1850], ['KeyD', 600], ['KeyJ', 1100], ['Space', 300],
    ['KeyA', 500], ['KeyJ', 1300], ['KeyK', 300], ['KeyJ', 900],
  ]) {
    await page.keyboard.down(key);
    await pause(ms);
    await page.keyboard.up(key);
    await pause(150);
  }
  await pause(1000);
  const video = page.video();
  await context.close();
  await copyFile(await video.path(), path.join(out, 'boss.webm'));
} finally {
  await browser.close();
}
