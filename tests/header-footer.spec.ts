import { test, expect } from '@playwright/test';

test.describe('desktop header', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Services dropdown works with the keyboard', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const services = nav.getByRole('button', { name: 'Services' });

    await expect(services).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link', { name: 'Design Services' })).toBeHidden();

    await services.focus();
    await page.keyboard.press('Enter');
    await expect(services).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'Branding and Strategy' })).toHaveAttribute('href', '/brandforge/');

    await page.keyboard.press('Tab');
    await expect(nav.getByRole('link', { name: 'Branding and Strategy' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(services).toHaveAttribute('aria-expanded', 'false');
    await expect(services).toBeFocused();
  });

  test('Services dropdown closes on an outside click', async ({ page }) => {
    await page.goto('/');
    const services = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Services' });
    await services.click();
    await expect(services).toHaveAttribute('aria-expanded', 'true');
    await page.locator('main').click({ position: { x: 5, y: 5 } });
    await expect(services).toHaveAttribute('aria-expanded', 'false');
  });

  test('header links and CTA match the live site', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    for (const [name, href] of [
      ['Case Studies', '/case-studies/'],
      ['About', '/about-us/'],
      ['Fractional Creative', '/fractional-creative/'],
      ['Contact Us', '/contact-us/'],
      ['Blog', '/blog/'],
    ]) {
      await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
    await expect(page.getByRole('banner').getByRole('link', { name: "Let's talk" })).toHaveAttribute('href', '/coffee/');
    await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();
  });
});

test.describe('mobile header', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('menu opens as a dialog, expands Services, and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Menu' });
    await expect(page.getByRole('link', { name: 'Book a Meeting' })).toHaveAttribute(
      'href',
      'https://bit.ly/chatwithfounding',
    );

    await menuButton.click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await expect(dialog).toBeVisible();

    const services = dialog.getByRole('button', { name: 'Services' });
    await services.click();
    await expect(services).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.getByRole('link', { name: 'Animation Services' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('tapping empty space in the menu panel keeps it open', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    const box = (await dialog.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 10);
    await expect(dialog).toBeVisible();
  });

  test('close button closes the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu' });
    await dialog.getByRole('button', { name: 'Close menu' }).click();
    await expect(dialog).toBeHidden();
  });

  test('page does not scroll sideways', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test('footer has the live columns, LinkedIn, and legal links', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');

  for (const heading of ['Company', 'What we do', 'SiteLaunch™', 'Our latest work', 'Field Notes blog']) {
    await expect(footer.getByRole('heading', { name: heading })).toBeVisible();
  }
  await expect(footer.getByRole('link', { name: 'Prism SiteLaunch' })).toHaveAttribute('href', '/prism-sitelaunch/');
  await expect(footer.getByRole('link', { name: 'View all case studies' })).toHaveAttribute('href', '/case-studies/');
  await expect(footer.getByRole('link', { name: /Creative tips weekly/ })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/company/founding-creative/',
  );

  const legal = footer.getByRole('navigation', { name: 'Legal' });
  for (const [name, href] of [
    ['Imprint', '/imprint/'],
    ['Cookie Policy', '/opt-out-preferences/'],
    ['Disclaimer', '/disclaimer/'],
    ['Privacy Statement', '/privacy-statement-us/'],
  ]) {
    await expect(legal.getByRole('link', { name })).toHaveAttribute('href', href);
  }

  // Every team photo has alt text.
  for (const img of await footer.getByRole('list', { name: 'The Founding Creative team' }).getByRole('img').all()) {
    await expect(img).toHaveAttribute('alt', /\S/);
  }
  await expect(footer.getByRole('button', { name: 'Submit' })).toBeVisible();
});
