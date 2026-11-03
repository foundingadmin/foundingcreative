import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { redirectFor, vercel } from '../scripts/lib/vercel-redirects.mjs';
import inventory from '../src/data/wp-inventory.json' with { type: 'json' };

// Every WordPress URL the new site doesn't rebuild must redirect somewhere
// sensible (or 404 on purpose). Redirects live in vercel.json, so these
// checks read that file; the 404 checks run against the built site.

// The matcher is shared with scripts/check-urls.mjs.

type Entry = { path: string; port: string; redirectTo?: string; redirectsTo?: string };
const pages = inventory.pages as Entry[];

test('dropped pages redirect to their chosen destination', () => {
  for (const page of pages.filter((p) => p.port === 'drop' && p.redirectTo)) {
    const rule = redirectFor(page.path);
    expect(rule, `no redirect for ${page.path}`).toBeDefined();
    expect(rule!.destination, page.path).toBe(page.redirectTo);
    expect(rule!.permanent, `${page.path} should be a permanent redirect`).toBe(true);
  }
});

test('WordPress redirects carry over', () => {
  // Slashless URLs: Vercel adds the trailing slash.
  expect(vercel.trailingSlash).toBe(true);
  for (const page of pages.filter((p) => p.port === 'redirect')) {
    const target = page.redirectsTo!;
    if (target.startsWith('/')) {
      expect(target, page.path).toBe(`${page.path}/`);
    } else {
      expect(redirectFor(page.path)?.destination, page.path).toBe(target);
    }
  }
});

test('old WordPress archive and filter URLs redirect', () => {
  const cases: [string, string][] = [
    ['/case-studies/_sector-finance/_service-website/', '/case-studies/'],
    ['/case-studies/_sector-agriculture/', '/case-studies/'],
    ['/blog/page/2/', '/blog/'],
    ['/tag/branding/', '/blog/'],
    ['/comments/feed/', '/feed/'],
    // WordPress's sitemap URLs (Search Console may still have them).
    ['/sitemap_index.xml', '/sitemap-index.xml'],
    ['/sitemap.xml', '/sitemap-index.xml'],
  ];
  for (const [path, destination] of cases) {
    expect(redirectFor(path)?.destination, path).toBe(destination);
  }
});

test('old case study copies Google still knows redirect to the live case study', () => {
  const legacy = readFileSync(new URL('../scripts/legacy-urls.txt', import.meta.url), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('/'));
  expect(legacy.length).toBeGreaterThan(30);
  for (const path of legacy) {
    const rule = redirectFor(path);
    expect(rule, `no redirect for ${path}`).toBeDefined();
    expect(rule!.permanent, path).toBe(true);
    expect(rule!.destination, path).toMatch(/^\/case-stud(y\/[a-z-]+|ies)\/$/);
  }

  const cases: [string, string][] = [
    ['/case-studies/atl-freight-website/', '/case-study/atlfreight-website/'],
    ['/case-studies-old/atl-freight-website/', '/case-study/atlfreight-website/'],
    ['/case-study/bell-bird-atm-2/', '/case-study/bell-bird-atm/'],
    ['/case-studies-old/bell-bird-atm-old/', '/case-study/bell-bird-atm/'],
    ['/case-studies/mastercard-innovation-forum-2-2-2/', '/case-study/innovation-forum-event/'],
    ['/case-studies/hucklerberry-holler-website/', '/case-study/plant-nursery-ecommerce/'],
    ['/case-studies-old/a-copy-we-never-saw/', '/case-studies/'],
    ['/case-studies-old/', '/case-studies/'],
    ['/testimonial/jon-ciotti/', '/about-us/'],
  ];
  for (const [path, destination] of cases) {
    expect(redirectFor(path)?.destination, path).toBe(destination);
  }
  // The live case study pages themselves never redirect.
  expect(redirectFor('/case-study/bell-bird-atm/')).toBeUndefined();
  expect(redirectFor('/case-studies/')).toBeUndefined();
});

test('leftover WordPress pages are gone (404)', async ({ request }) => {
  for (const page of pages.filter((p) => p.port === 'drop' && !p.redirectTo)) {
    expect(redirectFor(page.path), `${page.path} should not redirect`).toBeUndefined();
    const response = await request.get(page.path);
    expect(response.status(), page.path).toBe(404);
  }
});

test('404 page helps people find their way', async ({ page }) => {
  const response = await page.goto('/sample-page/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
  await expect(page.getByRole('main').getByRole('link', { name: 'Go to the homepage' })).toHaveAttribute('href', '/');
});
