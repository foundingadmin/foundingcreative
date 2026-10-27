import { test, expect } from '@playwright/test';

// Formspree is mocked so pull request runs never send real submissions.

const FORMSPREE = 'https://formspree.io/f/**';

async function fillRequired(page: import('@playwright/test').Page) {
  await page.getByLabel('Name', { exact: true }).fill('Test Person');
  await page.getByLabel('Email', { exact: true }).fill('test@example.com');
  await page.getByLabel('Message', { exact: true }).fill('Testing the contact form.');
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
  await page.getByLabel('Company', { exact: true }).fill('Acme');
  const optIn = page.getByRole('checkbox', { name: /occasional emails/ });
  await expect(optIn, 'marketing opt-in starts unchecked').not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Privacy Statement' })).toHaveAttribute('href', '/privacy-statement-us/');
  await optIn.check();
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('status')).toContainText('Thanks, we got your message.');
  await expect(page.getByRole('status')).toBeFocused();
  await expect(page.locator('form[data-contact-form]')).toBeHidden();

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
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('alert')).toHaveText('should be an email');
  await expect(page.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled();
});

test('contact form requires name, email, and message before sending', async ({ page }) => {
  let sent = false;
  await page.route(FORMSPREE, (route) => {
    sent = true;
    return route.fulfill({ status: 200, body: '{}' });
  });

  await page.goto('/contact-us/');
  await page.getByRole('button', { name: 'Submit' }).click();

  expect(await page.getByLabel('Name', { exact: true }).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  expect(sent).toBe(false);
});
