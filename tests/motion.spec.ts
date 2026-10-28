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
