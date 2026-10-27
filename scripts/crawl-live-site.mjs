// Crawl the live WordPress site and write src/data/wp-inventory.json.
//
// Seeds from the sitemap plus a few known URLs, then follows internal links
// to catch pages the sitemap leaves out. Pages load with JavaScript off so
// we record the server-rendered head, which is what crawlers see.
//
// Usage: npm run crawl
// Re-running keeps each entry's hand-set `port`, `redirectTo`, and `ported`.
//
// `port` values:
//   port      rebuild the page at the same URL
//   redirect  already redirects on WordPress; carry the redirect over
//   drop      not rebuilt; 301 to `redirectTo` if set, otherwise a 404
//   review    not decided yet

import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';

const ORIGIN = 'https://foundingcreative.com';
const OUT = new URL('../src/data/wp-inventory.json', import.meta.url);
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 4;

// Not in the sitemap but linked or referenced elsewhere.
const EXTRA_SEEDS = ['/coffee/', '/feed/'];

// Sections named in CLAUDE.md's site map. Everything else defaults to
// "review" so a person decides whether it is ported, redirected, or dropped.
const IN_SCOPE = [
  /^\/$/,
  /^\/about-us\/$/,
  /^\/fractional-creative\/$/,
  /^\/contact-us\/$/,
  /^\/coffee\/$/,
  /^\/brandforge\/$/,
  /^\/services\/(design|website|event|animation)-services\/$/,
  /^\/services\/custom\/$/,
  /^\/(rocket|prism|orbit)-sitelaunch\/$/,
  /^\/case-studies\/$/,
  /^\/case-study\/[^/]+\/$/,
  /^\/blog\/$/,
  /^\/feed\/$/,
  /^\/(imprint|disclaimer)\/$/,
  /^\/cookie-policy-[a-z]+\/$/,
  /^\/privacy-statement-[a-z]+\/$/,
];

// Segments starting with "_" are filter combinations on listing pages
// (/case-studies/_sector-finance/_service-website/), effectively endless.
const SKIP_PATH =
  /^\/(wp-|xmlrpc|comments\/feed|feed\/.+)|\/_[^/]+|\.(png|jpe?g|gif|webp|svg|pdf|zip|mp4|css|js|xml|txt)$/i;

function normalize(href) {
  let url;
  try {
    url = new URL(href, ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== ORIGIN) return null;
  if (SKIP_PATH.test(url.pathname)) return null;
  return url.pathname;
}

async function sitemapPaths() {
  const xml = await (await fetch(`${ORIGIN}/sitemap_index.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => normalize(m[1])).filter(Boolean);
}

// WP Engine returns 504s under even light parallel load, so retry with backoff.
async function crawlPage(context, path) {
  let result;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    result = await loadPage(context, path);
    if (result.status && result.status < 500) return result;
    await new Promise((resolve) => setTimeout(resolve, attempt * 5_000));
  }
  return result;
}

async function loadPage(context, path) {
  const page = await context.newPage();
  try {
    const response = await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const status = response?.status() ?? null;
    const final = new URL(page.url());
    const contentType = response?.headers()['content-type'] ?? '';

    // Record where a redirect lands, as a path when it stays on the site.
    if (final.href !== ORIGIN + path) {
      const redirectsTo = final.origin === ORIGIN ? final.pathname + final.search : final.href;
      if (final.origin !== ORIGIN) return { path, status, redirectsTo, links: [] };
      if (status !== 200) return { path, status, redirectsTo, contentType, links: [] };
      return { path, status, redirectsTo, contentType, links: await pageLinks(page) };
    }

    if (status !== 200 || !contentType.includes('text/html')) {
      return { path, status, contentType, links: [] };
    }

    const head = await page.evaluate(() => {
      const all = (selector, attr) =>
        [...document.querySelectorAll(selector)].map((el) => (attr ? el.getAttribute(attr) : el.textContent) ?? '');
      const og = {};
      for (const el of document.querySelectorAll('meta[property^="og:"]')) {
        const key = el.getAttribute('property');
        (og[key] ??= []).push(el.getAttribute('content') ?? '');
      }
      return {
        title: document.title,
        descriptions: all('meta[name="description"]', 'content'),
        canonicals: all('link[rel="canonical"]', 'href'),
        robots: all('meta[name="robots"]', 'content'),
        og,
        h1s: [...document.querySelectorAll('h1')].map((el) => el.textContent.replace(/\s+/g, ' ').trim()),
        links: all('a[href]', 'href'),
      };
    });

    return { path, status, contentType, ...head };
  } catch (error) {
    return { path, status: null, error: String(error).split('\n')[0], links: [] };
  } finally {
    await page.close();
  }
}

function pageLinks(page) {
  return page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? ''));
}

function classify(path, og) {
  if (path === '/') return 'home';
  if (path.startsWith('/case-study/')) return 'case-study';
  if (path.startsWith('/testimonial/')) return 'testimonial';
  if (path.startsWith('/services/') || path === '/brandforge/') return 'service';
  if (/-sitelaunch\/$/.test(path)) return 'sitelaunch';
  if (/^\/(imprint|disclaimer|cookie-policy|privacy-statement|opt-out)/.test(path)) return 'legal';
  // Blog posts sit at the site root like pages; WordPress marks them as articles.
  if (og?.['og:type']?.[0] === 'article' && /^\/[^/]+\/$/.test(path)) return 'post';
  return 'page';
}

function defaultPort(entry) {
  if (entry.redirectsTo) return 'redirect';
  if (entry.status !== 200) return 'review';
  if (entry.type === 'post' || IN_SCOPE.some((re) => re.test(entry.path))) return 'port';
  return 'review';
}

async function main() {
  let previous = {};
  try {
    const old = JSON.parse(await readFile(OUT, 'utf8'));
    previous = Object.fromEntries(old.pages.map((p) => [p.path, p]));
  } catch {}

  const fromSitemap = new Set(await sitemapPaths());
  const queue = [...new Set([...fromSitemap, ...EXTRA_SEEDS])];
  const seen = new Set(queue);
  const foundOn = {};
  const results = [];

  const browser = await chromium.launch();
  const context = await browser.newContext({ javaScriptEnabled: false });

  async function worker() {
    while (queue.length) {
      const path = queue.shift();
      const result = await crawlPage(context, path);
      results.push(result);
      console.log(`${result.status ?? 'ERR'} ${path}${result.redirectsTo ? ` -> ${result.redirectsTo}` : ''}`);
      for (const href of result.links ?? []) {
        const next = normalize(href);
        if (next && !seen.has(next)) {
          seen.add(next);
          foundOn[next] = path;
          queue.push(next);
        }
      }
    }
  }
  // Workers drain a shared queue. A worker stops when the queue is empty, so
  // links found late are crawled by the workers still running.
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();

  const pages = results
    .map(({ links, ...r }) => {
      const kept = previous[r.path] ?? {};
      const entry = {
        ...r,
        type: classify(r.path, r.og),
        inSitemap: fromSitemap.has(r.path),
        foundOn: fromSitemap.has(r.path) ? null : (foundOn[r.path] ?? 'seed'),
      };
      return {
        ...entry,
        port: kept.port ?? defaultPort(entry),
        ...(kept.redirectTo && { redirectTo: kept.redirectTo }),
        ported: kept.ported ?? false,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const inventory = { source: ORIGIN, crawledAt: new Date().toISOString().slice(0, 10), pages };
  await writeFile(OUT, JSON.stringify(inventory, null, 2) + '\n');
  console.log(`\nWrote ${pages.length} entries to ${OUT.pathname}`);
}

await main();
