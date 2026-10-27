import { test, expect, type Page } from '@playwright/test';

// Formspree is mocked so pull request runs never send real submissions.

const FORMSPREE = 'https://formspree.io/f/**';

// The footer has its own short form on every page, so scope to the page's form.
const pageForm = (page: Page) => page.getByRole('main');

async function fillRequired(page: Page) {
  await pageForm(page).getByLabel('Name', { exact: true }).fill('Test Person');
  await pageForm(page).getByLabel('Email', { exact: true }).fill('test@example.com');
  await pageForm(page).getByLabel('Message', { exact: true }).fill('Testing the contact form.');
}

test('contact form submits to Formspree and confirms inline', async ({ page }) => {
  let posted: { url: string; body: string; accept?: string } | undefined;
  await page.route(FORMSPREE, async (route) => {
    const request = route.request();
    posted = { url: request.url(), body: request.postData() ?? '', accept: request.headers()['accept'] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/contact-us/');
  await fillRequired(page);
  await pageForm(page).getByLabel('Company', { exact: true }).fill('Acme');
  const optIn = pageForm(page).getByRole('checkbox', { name: /occasional emails/ });
  await expect(optIn, 'marketing opt-in starts unchecked').not.toBeChecked();
  await expect(pageForm(page).getByRole('link', { name: 'Privacy Statement' })).toHaveAttribute('href', '/privacy-statement-us/');
  await optIn.check();
  await pageForm(page).getByRole('button', { name: 'Submit' }).click();

  await expect(pageForm(page).getByRole('status')).toContainText('Thanks, we got your message.');
  await expect(pageForm(page).getByRole('status')).toBeFocused();
  await expect(pageForm(page).locator('form[data-contact-form]')).toBeHidden();

  expect(posted?.url).toMatch(/^https:\/\/formspree\.io\/f\/[^/]+$/);
  expect(posted?.accept).toContain('application/json');
  for (const value of ['Test Person', 'test@example.com', 'Testing the contact form.', 'Acme', 'Contact page', 'marketing_opt_in']) {
    expect(posted?.body).toContain(value);
  }
});

test('contact form shows Formspree errors and keeps the form', async ({ page }) => {
  await page.route(FORMSPREE, (route) =>
    route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ errors: [{ field: 'email', message: 'should be an email' }] }),
    }),
  );

  await page.goto('/contact-us/');
  await fillRequired(page);
  await pageForm(page).getByRole('button', { name: 'Submit' }).click();

  await expect(pageForm(page).getByRole('alert')).toHaveText('should be an email');
  await expect(pageForm(page).getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(pageForm(page).getByRole('button', { name: 'Submit' })).toBeEnabled();
});

test('contact form requires name, email, and message before sending', async ({ page }) => {
  let sent = false;
  await page.route(FORMSPREE, (route) => {
    sent = true;
    return route.fulfill({ status: 200, body: '{}' });
  });

  await page.goto('/contact-us/');
  await pageForm(page).getByRole('button', { name: 'Submit' }).click();

  expect(await pageForm(page).getByLabel('Name', { exact: true }).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  expect(sent).toBe(false);
});

test('SiteLaunch inquiry form preselects the package and sends it with the timeline', async ({ page }) => {
  let body = '';
  await page.route(FORMSPREE, async (route) => {
    body = route.request().postData() ?? '';
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });

  await page.goto('/rocket-sitelaunch/');
  const form = page.locator('#get-started');
  await expect(form.getByLabel('SiteLaunch package')).toHaveValue('Rocket');
  await form.getByLabel('Name', { exact: true }).fill('Test Person');
  await form.getByLabel('Email', { exact: true }).fill('test@example.com');
  await form.getByLabel('Message', { exact: true }).fill('We need more leads.');
  await form.getByLabel('Ideal launch timeline').selectOption('In 1 to 3 months');
  await form.getByRole('button', { name: 'Submit' }).click();

  await expect(form.getByRole('status')).toContainText('Thanks, we got your message.');
  for (const value of ['SiteLaunch: Rocket', 'sitelaunch_package', 'Rocket', 'In 1 to 3 months', 'New Rocket SiteLaunch inquiry']) {
    expect(body).toContain(value);
  }
});
