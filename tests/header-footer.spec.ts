import { test, expect } from '@playwright/test';

test.describe('desktop header', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('Services dropdown works with the keyboard', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    const services = nav.getByRole('button', { name: 'Services menu' });

    // "Services" is a real link, so crawlers reach the services index from the nav.
    await expect(nav.getByRole('link', { name: 'Services', exact: true })).toHaveAttribute('href', '/services/');
    await expect(services).toHaveAttribute('aria-expanded', 'false');
    await expect(nav.getByRole('link', { name: 'Design Services' })).toBeHidden();

    await services.focus();
    await page.keyboard.press('Enter');
    await expect(services).toHaveAttribute('aria-expanded', 'true');
    await expect(nav.getByRole('link', { name: 'Branding and Strategy' })).toHaveAttribute(
      'href',
      '/services/branding-services/',
    );
    // The services index is the Services link itself, not a menu item.
    await expect(nav.getByRole('link', { name: 'All services' })).toHaveCount(0);

    await page.keyboard.press('Tab');
    await expect(nav.getByRole('link', { name: 'Branding and Strategy' })).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(services).toHaveAttribute('aria-expanded', 'false');
    await expect(services).toBeFocused();
  });

  test('Services dropdown closes on an outside click', async ({ page }) => {
    await page.goto('/');
    const services = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Services menu' });
    await services.click();
    await expect(services).toHaveAttribute('aria-expanded', 'true');
    // Below the full-width panel, which covers the top of the page while open.
    await page.locator('main').click({ position: { x: 5, y: 700 } });
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
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
  });
});

test.describe('mobile header', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('menu opens as a dialog, expands Services, and closes with Escape', async ({ page }) => {
    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(page.getByRole('link', { name: 'Book a Meeting' })).toHaveAttribute(
      'href',
      /^https:\/\/calendar\.google\.com\/calendar\/appointments\/schedules\//,
    );

    await menuButton.click();
    const dialog = page.getByRole('dialog', { name: 'Menu', exact: true });
    await expect(dialog).toBeVisible();

    // "Services" is a link to the services page; the chevron opens the list.
    await expect(dialog.getByRole('link', { name: 'Services', exact: true })).toHaveAttribute('href', '/services/');
    await expect(dialog.getByRole('link', { name: 'All services' })).toHaveCount(0);
    const services = dialog.getByRole('button', { name: 'Services menu' });
    await services.click();
    await expect(services).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.getByRole('link', { name: 'Animation Services' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Branding and Strategy' })).toHaveAttribute(
      'href',
      '/services/branding-services/',
    );
    await expect(dialog.getByRole('link', { name: /BrandForge/ })).toHaveAttribute('href', '/brandforge/');
    await expect(dialog.locator('a[href*="sitelaunch"]')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test('tapping empty space in the menu panel keeps it open', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu', exact: true });
    const box = (await dialog.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 10);
    await expect(dialog).toBeVisible();
  });

  test('close button closes the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Menu', exact: true });
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

  for (const heading of ['Company', 'What we do', 'Our latest work', 'Field Notes blog']) {
    await expect(footer.getByRole('heading', { name: heading })).toBeVisible();
  }
  // SiteLaunch is sunset; Fractional Creative sits under What we do.
  await expect(footer.getByRole('heading', { name: /SiteLaunch/ })).toHaveCount(0);
  await expect(footer.locator('a[href*="sitelaunch"]')).toHaveCount(0);
  const whatWeDo = footer.locator('section[aria-labelledby="footer-services"]');
  await expect(whatWeDo.getByRole('link', { name: 'Fractional Creative' })).toHaveAttribute('href', '/fractional-creative/');
  await expect(whatWeDo.getByRole('link', { name: 'Branding and Strategy' })).toHaveAttribute(
    'href',
    '/services/branding-services/',
  );
  await expect(
    footer.locator('section[aria-labelledby="footer-company"]').getByRole('link', { name: 'Fractional Creative' }),
  ).toHaveCount(0);
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

test('the homepage has one H1, the footer tagline is not a heading, and its credit reads in full', async ({ page }) => {
  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your complete creative department, built on strategy.');
  await expect(footer.getByText('Your complete creative department, built on strategy.')).toBeVisible();
  await expect(footer.getByRole('heading', { name: /creative department/ })).toHaveCount(0);
  await expect(footer.locator('.footer-bottom__credit')).toHaveText('Designed & developed with love by Founding Creative');
});

test('pages carry no generator tag, and non-production builds are noindex', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="generator"]')).toHaveCount(0);
  // Local and preview builds have no VERCEL_ENV=production, so they stay out of search.
  if (!process.env.PLAYWRIGHT_BASE_URL?.includes('foundingcreative.com')) {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  }
});
