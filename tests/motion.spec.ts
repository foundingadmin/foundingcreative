import { test, expect } from '@playwright/test';

// The live site's motion, rebuilt: scroll reveal, sliders, the logo marquee,
// and the banded case study layout.

test.use({ viewport: { width: 1440, height: 900 } });

test('content fades in as it scrolls into view', async ({ page }) => {
  await page.goto('/');
  const intro = page.locator('.section__intro', { has: page.locator('#engagement-heading') });
  await expect(intro).not.toHaveClass(/is-revealed/);
  await intro.scrollIntoViewIfNeeded();
  await expect(intro).toHaveClass(/is-revealed/);
  await expect(intro).toHaveCSS('opacity', '1');
});

test('reduced motion shows everything in place', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const intro of await page.locator('.section__intro').all()) {
    await expect(intro).toHaveCSS('opacity', '1');
  }
});

test('service sliders move with their buttons', async ({ page }) => {
  await page.goto('/');
  const track = page.locator('#service-0-work');
  const prev = page.locator('[data-carousel-prev][aria-controls="service-0-work"]');
  const next = page.locator('[data-carousel-next][aria-controls="service-0-work"]');
  await track.scrollIntoViewIfNeeded();
  await expect(prev).toBeDisabled();
  await next.click();
  await expect.poll(() => track.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(prev).toBeEnabled();
});

test('service hero images wipe from one to the next', async ({ page }) => {
  await page.goto('/services/design-services/');
  const slider = page.getByRole('region', { name: 'Design Services examples' });
  const active = slider.locator('.wipe__slide.is-active');
  await expect(active).toHaveCount(1);
  await expect(active).toHaveAttribute('aria-label', '1 of 3');
  await slider.getByRole('button', { name: 'Next image' }).click();
  await expect(active).toHaveAttribute('aria-label', '2 of 3');
  await expect(slider.locator('[data-wipe-current]')).toHaveText('02');
  await expect(slider.getByRole('button', { name: 'Show image 2' })).toHaveAttribute('aria-current', 'true');
  // Back past the first image wraps around to the last.
  await slider.getByRole('button', { name: 'Previous image' }).click();
  await slider.getByRole('button', { name: 'Previous image' }).click();
  await expect(active).toHaveAttribute('aria-label', '3 of 3');
  // Only the showing image is exposed to screen readers.
  await expect(slider.locator('.wipe__slide:not([aria-hidden])')).toHaveCount(1);
  const pause = slider.getByRole('button', { name: 'Pause slideshow' });
  await pause.click();
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
});

test('service pages show their own case studies', async ({ page }) => {
  await page.goto('/services/design-services/');
  await expect(page.locator('#work-slider > li')).toHaveCount(3);
  await expect(page.locator('h1')).toHaveCount(1);
});

test('BrandForge shows its workshop slider and branding work', async ({ page }) => {
  await page.goto('/brandforge/');
  await expect(page.getByRole('region', { name: 'BrandForge workshop examples' })).toBeVisible();
  await expect(page.locator('#work-slider > li')).toHaveCount(4);
  await expect(page.locator('.feature')).toHaveCount(6);
  // Stat numbers are real text in the page, whatever the count-up does.
  await expect(page.locator('.stat__value').first()).toHaveAttribute('data-count', '75%');
});

test('About team members link to their own LinkedIn profiles', async ({ page }) => {
  await page.goto('/about-us/');
  const links = page.locator('.person__linkedin');
  await expect(links).toHaveCount(6);
  const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(6);
  await expect(page.getByRole('link', { name: 'Tyler Lukey on LinkedIn' })).toHaveAttribute(
    'href',
    'https://www.linkedin.com/in/tylerlukey/',
  );
});

test('our work slider lists every case study', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#work-slider > li')).toHaveCount(10);
});

test('logo marquee can be paused', async ({ page }) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Pause logo animation' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.clients__track')).toHaveCSS('animation-play-state', 'paused');
});

test('case studies are laid out in colored bands', async ({ page }) => {
  await page.goto('/case-study/turntide-website/');
  const tones = await page.locator('.case-band').evaluateAll((bands) => bands.map((b) => (b as HTMLElement).dataset.tone));
  expect(tones[0]).toBe('white');
  expect(tones).toContain('light');
  expect(tones).toContain('accent');
  expect(tones).toContain('dark');
  await expect(page.locator('.case-band--statement .statement').first()).toContainText('We made the Turntide site');
  await expect(page.locator('h1')).toHaveCount(1);
  // Wrapped images stay inside their dark boxes.
  for (const box of await page.locator('.on-dark').all()) {
    await expect(box.locator('img')).toHaveCount(1);
  }
  // The other case studies follow, not this one.
  await expect(page.locator('#work-slider > li')).toHaveCount(9);
});
