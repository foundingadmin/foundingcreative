import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Site-wide checks on every page in the sitemap: it loads, has no console
// errors, passes an automated WCAG 2.1 AA scan, and its internal links work.

async function sitemapPaths(page: Page) {
  const xml = await (await page.request.get('/sitemap-0.xml')).text();
  return [...xml.matchAll(/<loc>https:\/\/foundingcreative\.com([^<]*)<\/loc>/g)].map((m) => m[1]);
}

test('every sitemap page loads without console errors and passes axe (WCAG 2.1 AA)', async ({ page }) => {
  test.setTimeout(180_000);
  const paths = await sitemapPaths(page);
  expect(paths.length).toBeGreaterThan(40);
  // Scan with reduced motion so nothing is mid-fade or still waiting to be
  // scrolled into view: every element is checked in its final state.
  await page.emulateMedia({ reducedMotion: 'reduce' });

  const failures: string[] = [];
  for (const path of paths) {
    const errors: string[] = [];
    const onConsole = (msg: import('@playwright/test').ConsoleMessage) => {
      // Adobe Fonts only serves listed domains, so it can fail locally.
      if (msg.type() === 'error' && !msg.text().includes('typekit')) errors.push(msg.text());
    };
    page.on('console', onConsole);
    const response = await page.goto(path);
    page.off('console', onConsole);

    if (response?.status() !== 200) failures.push(`${path}: status ${response?.status()}`);
    for (const error of errors) failures.push(`${path}: console error: ${error}`);

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    for (const violation of results.violations) {
      const targets = violation.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ');
      failures.push(`${path}: [${violation.impact}] ${violation.id}: ${violation.help} (${targets})`);
    }
  }
  expect(failures, failures.join('\n')).toEqual([]);
});

test('internal links all resolve', async ({ page }) => {
  test.setTimeout(180_000);
  const paths = await sitemapPaths(page);
  const links = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    for (const href of await page.locator('a[href^="/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')!))) {
      links.add(href.split('#')[0]);
    }
  }

  const broken: string[] = [];
  for (const href of links) {
    if (!href || href === '/coffee/' || href === '/feed/') continue; // Vercel-only redirect and rewrite
    const response = await page.request.get(href, { maxRedirects: 0 });
    if (response.status() >= 400) broken.push(`${href}: ${response.status()}`);
  }
  expect(broken, broken.join('\n')).toEqual([]);
});
