import { test, expect } from '@playwright/test';

// Every page's head comes from src/components/SEO.astro. This checks the
// shipped HTML of every sitemap page has the full set of tags, once each.
// (tests/inventory.spec.ts checks the values against the WordPress crawl.)

const once = [
  'title',
  'meta[name="description"]',
  'link[rel="canonical"]',
  'meta[property="og:type"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:url"]',
  'meta[property="og:image"]',
  'meta[property="og:image:width"]',
  'meta[property="og:image:height"]',
  'meta[property="og:image:alt"]',
  'meta[property="og:site_name"]',
  'meta[property="og:locale"]',
  'meta[name="twitter:card"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image"]',
];

test('every sitemap page has one full set of search and share tags', async ({ page }) => {
  test.setTimeout(120_000);
  const xml = await (await page.request.get('/sitemap-0.xml')).text();
  const paths = [...xml.matchAll(/<loc>https:\/\/foundingcreative\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
  expect(paths.length).toBeGreaterThan(40);

  for (const path of paths) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const head = page.locator('head');
    for (const selector of once) {
      await expect(head.locator(selector), `${path} ${selector}`).toHaveCount(1);
    }
    await expect(page.locator('h1'), `${path} h1`).toHaveCount(1);
    await expect(head.locator('meta[name="generator"]'), `${path} generator`).toHaveCount(0);
    await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(head.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://foundingcreative.com${path}`);

    // Share image: a JPEG at the 1200x630 shape (1.91:1).
    await expect(head.locator('meta[property="og:image"]')).toHaveAttribute('content', /^https:\/\/foundingcreative\.com\/.+\.jpg$/);
    const width = Number(await head.locator('meta[property="og:image:width"]').getAttribute('content'));
    const height = Number(await head.locator('meta[property="og:image:height"]').getAttribute('content'));
    expect(Math.abs(width / height - 1200 / 630), `${path} share image ratio`).toBeLessThan(0.01);

    // Share text matches between Open Graph and Twitter.
    const og = await head.locator('meta[property="og:title"]').getAttribute('content');
    await expect(head.locator('meta[name="twitter:title"]')).toHaveAttribute('content', og ?? '');

    // JSON-LD parses.
    for (const script of await head.locator('script[type="application/ld+json"]').all()) {
      const json = (await script.textContent()) ?? '';
      expect(() => JSON.parse(json), `${path} JSON-LD`).not.toThrow();
    }
  }
});
