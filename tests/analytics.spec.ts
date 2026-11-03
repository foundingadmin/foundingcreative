import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Consent banner and GA4 events. GA4 only runs on foundingcreative.com in a
// production build, so the event test serves the local build under that
// hostname (page.route proxies it) and gives the page a fake measurement ID.
// Google is never contacted: gtag.js is stubbed and events are read from
// window.dataLayer.

test.use({ storageState: { cookies: [], origins: [] } });

test('consent banner: shown until a choice, remembered, reopened from the footer', async ({ page }) => {
  const gtm: string[] = [];
  page.on('request', (request) => request.url().includes('googletagmanager') && gtm.push(request.url()));

  await page.goto('/');
  const banner = page.getByRole('region', { name: 'Cookies' });
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('link', { name: 'cookie policy' })).toHaveAttribute('href', '/opt-out-preferences/');
  const scan = await new AxeBuilder({ page }).include('[data-consent-banner]').withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(scan.violations.map((v) => v.id)).toEqual([]);

  await banner.getByRole('button', { name: 'Decline' }).click();
  await expect(banner).toBeHidden();
  await page.reload();
  await expect(banner).toBeHidden();

  await page.getByRole('contentinfo').getByRole('button', { name: 'Cookie settings' }).click();
  await expect(banner).toBeVisible();
  await expect(banner.getByRole('button', { name: 'Accept analytics' })).toBeFocused();

  // Not production and not foundingcreative.com: accepting still loads nothing.
  await banner.getByRole('button', { name: 'Accept analytics' }).click();
  await page.reload();
  expect(gtm).toEqual([]);
});

test.describe('GA4 events on the production host', () => {
  test.skip(!!process.env.PLAYWRIGHT_BASE_URL, 'needs the local build served as foundingcreative.com');

  const origin = 'http://foundingcreative.com';
  const events = (page: Page) =>
    page.evaluate(() =>
      window.dataLayer.map((entry) => Array.from(entry as ArrayLike<unknown>)).filter((args) => args[0] === 'event'),
    );
  // Record events without leaving the page.
  const stayOnPage = (page: Page) =>
    page.evaluate(() => window.addEventListener('click', (event) => event.preventDefault()));

  test.beforeEach(async ({ page, baseURL }) => {
    // Serve the local build as foundingcreative.com, with the measurement ID a
    // production build would put on <html>.
    await page.route(`${origin}/**`, async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: new URL(url.pathname + url.search, baseURL).href });
      const isHtml = response.headers()['content-type']?.includes('text/html');
      const body = isHtml ? (await response.text()).replace('<html lang="en"', '<html lang="en" data-ga-id="G-TEST123"') : undefined;
      await route.fulfill({ response, body });
    });
    await page.route('https://www.googletagmanager.com/**', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: '' }),
    );
  });

  test('nothing loads before consent; accepting loads gtag and the events fire', async ({ page }) => {
    const gtm: string[] = [];
    page.on('request', (request) => request.url().includes('googletagmanager') && gtm.push(request.url()));

    await page.goto(`${origin}/`);
    await page.waitForLoadState('load');
    expect(gtm, 'no Google request before consent').toEqual([]);
    const consentDefault = await page.evaluate(() =>
      window.dataLayer.map((entry) => Array.from(entry as ArrayLike<unknown>)).find((a) => a[0] === 'consent'),
    );
    expect(consentDefault).toEqual(['consent', 'default', expect.objectContaining({ analytics_storage: 'denied' })]);

    await page.getByRole('button', { name: 'Accept analytics' }).click();
    await expect.poll(() => gtm.length).toBe(1);
    expect(gtm[0]).toContain('id=G-TEST123');

    await stayOnPage(page);
    // Desktop header: "Let's talk" (/coffee/); the Google Calendar link is the
    // mobile header's Book a Meeting button.
    await page.getByRole('banner').getByRole('link', { name: "Let's talk" }).click();
    await page.locator('.site-header__book').dispatchEvent('click');
    await page.locator('.hero a.button--primary').first().click();
    expect(await events(page)).toEqual([
      ['event', 'book_meeting', expect.objectContaining({ link_text: "Let's talk" })],
      ['event', 'cta_click', expect.objectContaining({ cta_location: 'header', link_text: "Let's talk" })],
      ['event', 'book_meeting', expect.objectContaining({ link_text: 'Book a Meeting' })],
      ['event', 'cta_click', expect.objectContaining({ cta_location: 'hero' })],
    ]);

    await page.goto(`${origin}/imprint/`);
    await stayOnPage(page);
    await page.getByRole('main').locator('a[href^="mailto:"]').first().click();
    await page.getByRole('main').locator('a[href^="tel:"]').first().click();
    expect((await events(page)).map((e) => e[1])).toEqual(['email_click', 'phone_click']);
  });

  test('generate_lead fires on a successful Formspree response only', async ({ page }) => {
    let status = 422;
    await page.route('https://formspree.io/f/**', (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: status === 200 ? '{"ok":true}' : '{"errors":[{"message":"Nope"}]}',
      }),
    );
    await page.goto(`${origin}/contact-us/`);
    await page.getByRole('button', { name: 'Accept analytics' }).click();

    const form = page.getByRole('main');
    await form.getByLabel('Name', { exact: true }).fill('Test Person');
    await form.getByLabel('Email', { exact: true }).fill('test@example.com');
    await form.getByLabel('Message', { exact: true }).fill('Testing analytics.');
    await form.getByRole('button', { name: 'Submit' }).click();
    await expect(form.getByText('Nope')).toBeVisible();
    expect((await events(page)).map((e) => e[1])).not.toContain('generate_lead');

    status = 200;
    await form.getByRole('button', { name: 'Submit' }).click();
    await expect(form.getByRole('status')).toBeVisible();
    expect((await events(page)).map((e) => e[1])).toContain('generate_lead');
  });
});
