// Records a short silent clip of a client's live site in use, for the
// showcase "clip" module (docs/case-study-sop.md).
//
//   node scripts/record-case-study-clip.mjs <out dir>
//
// Writes clip.mp4 (H.264, no audio) and poster.png. Needs ffmpeg on the
// PATH. A dev tool, not part of the build. It only clicks the page's own
// filter buttons; the cookie banner is hidden with CSS, never answered.
// For the next client, change URL, STEPS and HIDE.

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const URL = 'https://82south.com/portfolio/';
// Each step clicks the filter with this label, then holds.
const STEPS = ['Exhibit', 'Activation', 'Media', 'Filter - All'];
const HOLD = 1700;
const SIZE = { width: 1280, height: 800 };
const HIDE = `
  .cmplz-cookiebanner, #cmplz-manage-consent { display: none !important; }
  li:has(> a[href*="digitalsignage"]), a[href*="digitalsignage"] { display: none !important; }
`;

const out = process.argv[2];
if (!out) throw new Error('Usage: node scripts/record-case-study-clip.mjs <out dir>');
mkdirSync(out, { recursive: true });
const raw = join(out, 'raw');
rmSync(raw, { recursive: true, force: true });

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: raw, size: SIZE } });
const page = await context.newPage();
const started = Date.now();
await page.goto(URL, { waitUntil: 'networkidle', timeout: 90_000 });
await page.addStyleTag({ content: HIDE });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
// The clip starts here: everything before it (the page loading) is cut.
const from = (Date.now() - started) / 1000;
await page.screenshot({ path: join(out, 'poster.png') });
await page.waitForTimeout(900);
for (const label of STEPS) {
  const button = page.getByText(label, { exact: true }).first();
  await button.hover();
  await page.waitForTimeout(350);
  await button.click();
  await page.waitForTimeout(HOLD);
}
const length = (Date.now() - started) / 1000 - from;
await context.close();
await browser.close();

const webm = join(raw, readdirSync(raw).find((file) => file.endsWith('.webm')));
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', from.toFixed(2), '-t', length.toFixed(2), '-i', webm, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '27', '-preset', 'slow', '-movflags', '+faststart', join(out, 'clip.mp4')]);
rmSync(raw, { recursive: true, force: true });
console.log(`saved ${join(out, 'clip.mp4')} (${length.toFixed(1)}s) and poster.png`);
