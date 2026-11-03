import { test, expect, type Page } from '@playwright/test';
import { vercel } from '../scripts/lib/vercel-redirects.mjs';

// Security headers live in vercel.json, which the local server doesn't
// apply. These tests check the headers are configured, then serve every page
// with them (page.route adds them to each document) and fail on any
// Content-Security-Policy violation, so a new script, font, or embed can't
// slip in without updating the policy.

type Header = { key: string; value: string };
const site: Header[] = vercel.headers.find((h: { source: string; missing?: unknown }) => h.source === '/(.*)' && !h.missing)
  .headers;
const header = (key: string) => site.find((h) => h.key === key)?.value;

// upgrade-insecure-requests would turn http://localhost requests into https.
const localCsp = header('Content-Security-Policy')!.replace(/;\s*upgrade-insecure-requests/, '');

async function serveWithHeaders(page: Page, origin: string, baseURL: string) {
  await page.route(`${origin}/**`, async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href });
    const headers = { ...response.headers() };
    if (route.request().resourceType() === 'document') {
      for (const { key, value } of site) headers[key.toLowerCase()] = value;
      headers['content-security-policy'] = localCsp;
    }
    await route.fulfill({ response, headers });
  });
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      (window as unknown as { cspViolations: string[] }).cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`),
    );
  });
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);

test('security headers are set for every response', () => {
  expect(header('Content-Security-Policy')).toContain("default-src 'self'");
  expect(header('Content-Security-Policy')).toContain("frame-ancestors 'none'");
  expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  expect(header('X-Content-Type-Options')).toBe('nosniff');
  expect(header('Permissions-Policy')).toContain('camera=()');
});

test('no page breaks the Content-Security-Policy', async ({ page, baseURL }) => {
  test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'the deployed site sends the real headers');
  test.setTimeout(180_000);
  await serveWithHeaders(page, new URL(baseURL!).origin, baseURL!);
  const xml = await (await page.request.get('/sitemap-0.xml')).text();
  const paths = [...xml.matchAll(/<loc>https:\/\/foundingcreative\.com([^<]*)<\/loc>/g)].map((m) => m[1]);

  const failures: string[] = [];
  for (const path of [...paths, '/no-such-page/']) {
    await page.goto(path);
    await page.waitForLoadState('load');
    for (const v of await violations(page)) failures.push(`${path}: ${v}`);
  }
  expect(failures).toEqual([]);
});

test('GA4 and the contact form work under the policy after consent', async ({ page, baseURL }) => {
  test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local build served as foundingcreative.com');
  const origin = 'http://foundingcreative.com';
  await serveWithHeaders(page, origin, baseURL!);
  await page.route(origin + '/contact-us/', async (route) => {
    const response = await route.fetch({ url: new URL('/contact-us/', baseURL).href });
    const headers = { ...response.headers() };
    for (const { key, value } of site) headers[key.toLowerCase()] = value;
    headers['content-security-policy'] = localCsp;
    const body = (await response.text()).replace('<html lang="en"', '<html lang="en" data-ga-id="G-TEST123"');
    await route.fulfill({ response, headers, body });
  });
  await page.route('https://www.googletagmanager.com/**', (route) => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.route('https://formspree.io/f/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );

  await page.goto(`${origin}/contact-us/`);
  await page.getByRole('button', { name: 'Accept analytics' }).click();
  const form = page.getByRole('main');
  await form.getByLabel('Name', { exact: true }).fill('Test Person');
  await form.getByLabel('Email', { exact: true }).fill('test@example.com');
  await form.getByLabel('Message', { exact: true }).fill('Testing the policy.');
  await form.getByRole('button', { name: 'Submit' }).click();
  await expect(form.getByRole('status')).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
