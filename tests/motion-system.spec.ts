import { test, expect } from '@playwright/test';

// Sprint 3.1: the shared motion layer. Subtle, consistent, and off for
// reduced-motion visitors.

test.use({ viewport: { width: 1280, height: 800 } });

test('sticky CTA slides up past the hero, hides near the footer, and can be closed', async ({ page }) => {
  await page.goto('/services/website-services/');
  const bar = page.getByRole('complementary', { name: 'Start a project' });
  await expect(bar).toBeHidden();

  await page.mouse.wheel(0, 1600);
  await expect(bar).toBeVisible();
  await expect(bar.getByRole('link', { name: /Let's talk/ })).toHaveAttribute('href', '/coffee/');

  await page.locator('footer').scrollIntoViewIfNeeded();
  await expect(bar).toBeHidden();

  await page.mouse.wheel(0, -2500);
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Close' }).click();
  await expect(bar).toBeHidden();
  // Stays closed for the session.
  await page.reload();
  await page.mouse.wheel(0, 1600);
  await expect(bar).toBeHidden();
});

test('no sticky CTA on the contact page', async ({ page }) => {
  await page.goto('/contact-us/');
  await expect(page.locator('[data-sticky-cta]')).toHaveCount(0);
});

test('custom cursor follows a mouse, and stays off with reduced motion', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/has-cursor/);
  await page.mouse.move(400, 300);
  await expect(page.locator('.cursor-dot')).not.toHaveClass(/is-hidden/);
  await expect(page.locator('.cursor-dot')).toHaveAttribute('aria-hidden', 'true');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/has-cursor/);
  await expect(page.locator('.cursor-dot')).toHaveCount(0);
});

test('scroll reveals only ever slide up', async ({ page }) => {
  await page.goto('/fractional-creative/');
  const transforms = await page
    .locator('[data-reveal]:not(.is-revealed):not([data-reveal="color"])')
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).transform));
  expect(transforms.length).toBeGreaterThan(0);
  for (const t of transforms) {
    if (t === 'none') continue; // already in place
    // matrix(1, 0, 0, 1, x, y): no sideways offset, no scale.
    const [a, , , d, x] = t.replace(/matrix\(|\)/g, '').split(',').map(Number);
    expect([a, d, x]).toEqual([1, 1, 0]);
  }
});

test('home services pin "We design / develop / build" and swap the verb on scroll', async ({ page }) => {
  await page.goto('/');
  const active = page.locator('[data-cycler] .cycler__word.is-active');
  const steps = page.locator('[data-cycler-step]');
  for (const [i, word] of ['design', 'develop', 'build'].entries()) {
    await steps.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(active).toHaveText(word);
    await expect(steps.nth(i).getByRole('heading', { level: 3 })).toContainText(`We ${word}`);
  }
});

test('BrandForge steps: four on Home linking to the page, and in full on BrandForge', async ({ page }) => {
  const titles = ['Discovery & Alignment', 'Strategy & Direction', 'Visual Identity', 'Activation'];
  await page.goto('/');
  const band = page.getByRole('region', { name: 'From zero to market-ready in four steps' });
  await expect(band.getByRole('heading', { level: 3 })).toHaveText(titles);
  await expect(band.getByRole('link', { name: /Explore BrandForge/ })).toHaveAttribute('href', '/brandforge/');

  await page.goto('/brandforge/');
  const steps = page.locator('.process-split__step');
  await expect(steps.getByRole('heading', { level: 3 })).toHaveText(titles);
  for (const step of await steps.all()) await expect(step.locator('img')).toHaveAttribute('alt', /\S/);
});

test('service work slider steps through projects with its buttons', async ({ page }) => {
  await page.goto('/services/website-services/');
  const slider = page.locator('[data-work-slider]');
  await expect(slider.locator('[data-work-current]')).toHaveText('01');
  await expect(slider.getByRole('button', { name: 'Previous project' })).toBeDisabled();
  await slider.getByRole('button', { name: 'Next project' }).click();
  await expect(slider.locator('[data-work-current]')).toHaveText('02');
  await expect(slider.getByRole('button', { name: 'Next project' })).toBeDisabled();
});
