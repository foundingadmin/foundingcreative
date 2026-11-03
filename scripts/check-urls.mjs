// Cutover check: every URL the WordPress site had (its sitemap, plus the
// legacy URLs Google still knows about, plus every literal redirect source)
// must either load or redirect to a page that loads on the new site.
//
//   node scripts/check-urls.mjs https://<preview>.vercel.app
//   node scripts/check-urls.mjs http://localhost:4321 --emulate-redirects
//
// Against a Vercel deploy the redirects are Vercel's own. Previews behind
// Vercel Deployment Protection need VERCEL_AUTOMATION_BYPASS_SECRET.
// `astro preview` doesn't read vercel.json, so locally --emulate-redirects
// applies its redirects and rewrites here (scripts/lib/vercel-redirects.mjs)
// before requesting the destination.
//
// Exits 1 if any URL ends in a 404 (or any other error), except the
// WordPress test pages that are dropped on purpose.

import { readFileSync } from 'node:fs';
import { redirectFor, rewriteFor, vercel } from './lib/vercel-redirects.mjs';

const [base, ...flags] = process.argv.slice(2);
if (!base) {
  console.error('Usage: node scripts/check-urls.mjs <base URL> [--emulate-redirects]');
  process.exit(2);
}
const emulate = flags.includes('--emulate-redirects');
const origin = new URL(base).origin;
const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = secret ? { 'x-vercel-protection-bypass': secret } : {};

// WordPress test pages, not ported on purpose (CLAUDE.md, Sprint 1.6).
const GONE = new Set(['/3d-test/', '/sample-page/', '/coming-soon/']);

const inventory = JSON.parse(readFileSync(new URL('../src/data/wp-inventory.json', import.meta.url), 'utf8'));
const legacy = readFileSync(new URL('./legacy-urls.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('/'));
const literalSources = vercel.redirects.map((r) => r.source).filter((source) => !/[(:*]/.test(source));

const paths = [
  ...new Set([...inventory.pages.filter((p) => p.inSitemap).map((p) => p.path), ...legacy, ...literalSources]),
];

/** Follows redirects (Vercel's, or emulated) and returns the final status. */
async function resolve(path) {
  const hops = [];
  let url = new URL(path, origin);
  for (let i = 0; i < 6; i++) {
    if (url.origin !== origin) return { status: 'external', url: url.href, hops };
    const rule = emulate ? redirectFor(url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`) : undefined;
    if (rule) {
      hops.push(rule.destination);
      url = new URL(rule.destination, origin);
      continue;
    }
    const rewrite = emulate ? rewriteFor(url.pathname) : undefined;
    const response = await fetch(rewrite ? new URL(rewrite.destination, origin) : url, { redirect: 'manual', headers });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      hops.push(location);
      url = new URL(location, url);
      continue;
    }
    return { status: response.status, url: url.href, hops };
  }
  return { status: 'loop', url: url.href, hops };
}

let failures = 0;
const results = await Promise.all(paths.map(async (path) => ({ path, ...(await resolve(path)) })));
for (const { path, status, url, hops } of results.sort((a, b) => a.path.localeCompare(b.path))) {
  const ok = status === 200 || status === 'external' || (GONE.has(path) && status === 404);
  if (!ok) failures++;
  const target = hops.length ? ` -> ${url.replace(origin, '')}` : '';
  const note = GONE.has(path) ? ' (dropped on purpose)' : hops.length > 1 ? ` (${hops.length} hops)` : '';
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(status).padEnd(8)} ${path}${target}${note}`);
}

console.log(`\n${paths.length} URLs checked against ${origin}${emulate ? ' (redirects emulated from vercel.json)' : ''}.`);
if (failures) {
  console.error(`${failures} URL(s) don't resolve to a live page.`);
  process.exit(1);
}
console.log('Every old URL loads or redirects to a live page.');
