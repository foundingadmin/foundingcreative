import { test, expect } from '@playwright/test';

// Field Notes, case studies, RSS, and sitemap. Head values for each page are
// covered by inventory.spec.ts; these check the content and SEO extras.

test('Field Notes index lists every post, newest first', async ({ page }) => {
  await page.goto('/blog/');
  const cards = page.getByRole('main').getByRole('article');
  await expect(cards).toHaveCount(13);
  await expect(cards.first().getByRole('heading')).toHaveText('Marketing Agency, Creative Design Studio, or Something Else?');
});

test('a post has its hero, body, structured data, and related posts', async ({ page }) => {
  await page.goto('/5-website-truths-for-marketers/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('5 Website Truths for Marketers');
  await expect(main.getByRole('heading', { name: /Slow Site = Leaky Funnel/ })).toBeVisible();
  await expect(main.locator('time').first()).toHaveAttribute('datetime', '2025-10-30');
  await expect(main.getByRole('heading', { name: 'More Field Notes' })).toBeVisible();

  const schema = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '[]');
  const types = [schema].flat().map((s: { '@type': string }) => s['@type']);
  expect(types).toEqual(expect.arrayContaining(['Organization', 'BlogPosting', 'BreadcrumbList']));

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.jpg$/);
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', /^2025-10-30/);
});

test('case studies index and a case study page', async ({ page }) => {
  await page.goto('/case-studies/');
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(10);

  await page.goto('/case-study/bank-apps/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Multiple internal sectors, multiple solutions');
  await expect(main.getByText('Bank of America', { exact: true })).toBeVisible();
  // The numbered user journey became a real ordered list.
  await expect(main.locator('ol li').first()).toContainText('Business needs to access a PDF');
});

test('every content image has alt text', async ({ page }) => {
  for (const path of ['/blog/', '/case-studies/', '/case-study/genpact-grow-event/', '/5-website-truths-for-marketers/']) {
    await page.goto(path);
    const missing = await page.locator('main img').evaluateAll((imgs) =>
      imgs.filter((img) => !img.getAttribute('alt')?.trim()).map((img) => img.getAttribute('src')),
    );
    expect(missing, `images without alt on ${path}`).toEqual([]);
  }
});

test('RSS feed lists the posts', async ({ request }) => {
  // Vercel serves this at /feed/ (vercel.json rewrite), the WordPress feed URL.
  const response = await request.get('/feed.xml');
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  expect(xml).toContain('<title>Founding Creative Field Notes</title>');
  expect(xml.match(/<item>/g)).toHaveLength(13);
  expect(xml).toContain('https://foundingcreative.com/5-website-truths-for-marketers/');
});

test('sitemap and robots.txt', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://foundingcreative.com/sitemap-index.xml');
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const url of ['/blog/', '/case-studies/', '/case-study/bank-apps/', '/5-website-truths-for-marketers/']) {
    expect(sitemap).toContain(`https://foundingcreative.com${url}`);
  }
});
