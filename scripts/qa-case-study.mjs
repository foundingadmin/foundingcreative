// Screenshots case study pages for the QA gate in docs/case-study-sop.md:
// each page at 1440 and 390 wide, full length, after scrolling through once
// so lazy images and scroll reveals have loaded.
//
//   node scripts/qa-case-study.mjs <base URL> <out dir> <slug> [<slug>...]
//
// A dev tool, not part of the build. Run it against `npm run preview`.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [base, out, ...slugs] = process.argv.slice(2);
if (!base || !out || !slugs.length) {
  throw new Error('Usage: node scripts/qa-case-study.mjs <base URL> <out dir> <slug> [<slug>...]');
}
mkdirSync(out, { recursive: true });

const SIZES = [
  { name: '1440', viewport: { width: 1440, height: 900 } },
  { name: '390', viewport: { width: 390, height: 844 } },
];

const browser = await chromium.launch();
for (const size of SIZES) {
  const context = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 1 });
  for (const slug of slugs) {
    const page = await context.newPage();
    await page.goto(`${base.replace(/\/$/, '')}/case-study/${slug}/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // The cookie banner would cover the page; hide it without answering it.
    await page.addStyleTag({ content: '[data-consent-banner] { display: none !important; }' });
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((done) => setTimeout(done, 120));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const file = join(out, `${slug}-${size.name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('saved', file);
    await page.close();
  }
  await context.close();
}
await browser.close();
