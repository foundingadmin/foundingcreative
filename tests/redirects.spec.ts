import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import inventory from '../src/data/wp-inventory.json' with { type: 'json' };

// Every WordPress URL the new site doesn't rebuild must redirect somewhere
// sensible (or 404 on purpose). Redirects live in vercel.json, so these
// checks read that file; the 404 checks run against the built site.

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
  trailingSlash?: boolean;
  redirects: { source: string; destination: string; permanent?: boolean }[];
};

// Minimal matcher for Vercel source patterns, following path-to-regexp:
// :name matches one segment, :name* matches segments but not a trailing
// slash, and (regex) groups are used as written.
function toRegExp(source: string) {
  const escape = (s: string) => s.replace(/[.+?^${}|[\]\\*]/g, '\\$&');
  let pattern = '';
  let last = 0;
  for (const m of source.matchAll(/:(\w+)(?:\(([^)]+)\))?(\*)?|\(([^)]+)\)/g)) {
    pattern += escape(source.slice(last, m.index));
    if (m[4]) pattern += `(${m[4]})`;
    else if (m[2]) pattern += `(${m[2]})`;
    else if (m[3]) pattern += '((?:[^/]+(?:/[^/]+)*)?)';
    else pattern += '([^/]+)';
    last = m.index! + m[0].length;
  }
  return new RegExp(`^${pattern}${escape(source.slice(last))}$`);
}

const redirectFor = (path: string) => vercel.redirects.find((r) => toRegExp(r.source).test(path));

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
  ];
  for (const [path, destination] of cases) {
    expect(redirectFor(path)?.destination, path).toBe(destination);
  }
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
