// Captures a client's live website for a case study, and composes the hero:
// the homepage in a browser window and on a phone, on the client's color.
//
//   node scripts/capture-case-study.mjs <out dir>
//
// A dev tool, not part of the build. It uses Playwright (a dev dependency)
// and sharp (installed with Astro). The cookie banner is hidden with CSS;
// nothing is ever clicked. For the next client, change SITE, PAGES and COLOR.

import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://82south.com';
const PAGES = [
  { name: 'home', path: '/', fullPage: true, mobile: true },
  { name: 'services', path: '/services/' },
  { name: 'portfolio', path: '/portfolio/', mobile: true },
  { name: 'about', path: '/about/' },
  { name: 'project', path: '/duck-creek-formation-2026/' },
];
const COLOR = '#532896';
const TYPED = { selector: '.x-text-typing', words: ['Events', 'Exhibits', 'Activations'] };
// Hidden in every shot: the cookie banner, and menu links to pages added
// after our build (the case study shows only the work we did).
const HIDE = `
  .cmplz-cookiebanner, #cmplz-manage-consent { display: none !important; }
  li:has(> a[href*="digitalsignage"]), a[href*="digitalsignage"] { display: none !important; }
`;

const out = process.argv[2];
if (!out) throw new Error('Usage: node scripts/capture-case-study.mjs <out dir>');
mkdirSync(out, { recursive: true });

async function shoot(context, page, name, fullPage) {
  const tab = await context.newPage();
  await tab.goto(SITE + page.path, { waitUntil: 'networkidle', timeout: 90_000 });
  await tab.addStyleTag({ content: HIDE });
  await tab.evaluate(() => document.fonts.ready);
  // The hero types its first word out; wait for a whole word.
  if (TYPED) await tab.waitForFunction(({ selector, words }) => words.includes(document.querySelector(selector)?.textContent.trim()), TYPED).catch(() => {});
  if (fullPage) {
    // Scroll through once so lazy images and scroll reveals have loaded.
    await tab.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((done) => setTimeout(done, 150));
      }
      window.scrollTo(0, 0);
    });
    await tab.waitForLoadState('networkidle');
  }
  await tab.waitForTimeout(1500);
  if (TYPED) await tab.waitForFunction(({ selector, words }) => words.includes(document.querySelector(selector)?.textContent.trim()), TYPED).catch(() => {});
  const file = join(out, `${name}.png`);
  await tab.screenshot({ path: file, fullPage });
  await tab.close();
  console.log('captured', file);
  return file;
}

const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
// The phone's whole screen (390x844), not the area under Safari's toolbars,
// so the shot fills a phone mockup without cropping its sides.
const mobile = await browser.newContext({ ...devices['iPhone 14'], viewport: { width: 390, height: 844 } });
for (const page of PAGES) {
  await shoot(desktop, page, page.name, false);
  if (page.fullPage) await shoot(desktop, page, `${page.name}-full`, true);
  if (page.mobile) await shoot(mobile, page, `${page.name}-mobile`, false);
}
await browser.close();

// Hero, 2400x1346: a browser window with the homepage, a phone over its
// lower right corner.
const W = 2400;
const H = 1346;
const win = { x: 250, y: 190, w: 1640, bar: 56, r: 28 };
win.h = Math.round((win.w * 900) / 1440);
const phone = { x: 1740, y: 420, w: 400, pad: 16, r: 64 };
phone.h = Math.round((phone.w * 844) / 390);

const rounded = (w, h, r) => Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
const fit = async (file, w, h, r) =>
  sharp(await sharp(file).resize(w, h, { fit: 'cover', position: 'top' }).toBuffer())
    .composite([{ input: rounded(w, h, r), blend: 'dest-in' }])
    .png()
    .toBuffer();

const frames = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="40" stdDeviation="40" flood-opacity="0.35"/></filter></defs>
  <rect width="${W}" height="${H}" fill="${COLOR}"/>
  <g filter="url(#shadow)">
    <rect x="${win.x}" y="${win.y - win.bar}" width="${win.w}" height="${win.h + win.bar}" rx="${win.r}" fill="#ffffff"/>
  </g>
  <g fill="#d9d9e3">
    <circle cx="${win.x + 40}" cy="${win.y - win.bar / 2}" r="9"/>
    <circle cx="${win.x + 72}" cy="${win.y - win.bar / 2}" r="9"/>
    <circle cx="${win.x + 104}" cy="${win.y - win.bar / 2}" r="9"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="${phone.x - phone.pad}" y="${phone.y - phone.pad}" width="${phone.w + 2 * phone.pad}" height="${phone.h + 2 * phone.pad}" rx="${phone.r}" fill="#16161d"/>
  </g>
</svg>`);

const hero = await sharp(frames)
  .composite([
    { input: await fit(join(out, 'home.png'), win.w, win.h, 0), left: win.x, top: win.y },
    // Round the window's bottom corners by redrawing the page color over them.
    {
      input: Buffer.from(
        `<svg width="${win.w}" height="${win.r}"><path d="M0 0A${win.r} ${win.r} 0 0 0 ${win.r} ${win.r}H0ZM${win.w} 0A${win.r} ${win.r} 0 0 1 ${win.w - win.r} ${win.r}H${win.w}Z" fill="${COLOR}"/></svg>`,
      ),
      left: win.x,
      top: win.y + win.h - win.r,
    },
    { input: await fit(join(out, 'home-mobile.png'), phone.w, phone.h, phone.r - phone.pad), left: phone.x, top: phone.y },
  ])
  .png()
  .toBuffer();

await sharp(hero).jpeg({ quality: 88 }).toFile(join(out, 'hero-2400x1346.jpg'));
await sharp(hero).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 85 }).toFile(join(out, 'share-1200x630.jpg'));
console.log('composed hero and share image');
