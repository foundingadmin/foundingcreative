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

test('About tells the story, shows client words, logos and a CTA', async ({ page }) => {
  await page.goto('/about-us/');
  await expect(page.getByRole('heading', { level: 2, name: 'The missing middle ground' })).toBeVisible();
  await expect(page.locator('.split-bar dt')).toHaveText(['Founding Creative', 'Traditional agency']);
  const quotes = page.locator('.quote figcaption strong');
  await expect(quotes).toHaveText(['Jon Ciotti', 'John Keen', 'DeAnna Miller', 'Paige Isovitsch', 'Brooke McPoyle']);
  await expect(page.getByRole('region', { name: "Brands we've worked with" })).toBeAttached();
  await expect(page.getByRole('heading', { level: 2, name: "Let's build your foundation" })).toBeVisible();
});

test('selecting text in a post offers to share it', async ({ page }) => {
  const slug = 'what-is-a-founding-designer-and-do-you-actually-need-one';
  await page.goto(`/${slug}/`);
  const tip = page.getByRole('toolbar', { name: 'Share the selected text' });
  await expect(tip).toBeHidden();

  await page.locator('.post-body p').first().evaluate((p) => {
    const range = document.createRange();
    range.selectNodeContents(p);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await expect(tip).toBeVisible();
  await expect(tip.getByRole('link', { name: 'Share on LinkedIn' })).toHaveAttribute(
    'href',
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://foundingcreative.com/${slug}/`)}`,
  );
  await expect(tip.getByRole('button', { name: 'Copy quote with link' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();

  // Nothing for selections in the contents list.
  await page.locator('.post-body nav a').first().evaluate((a) => {
    const range = document.createRange();
    range.selectNodeContents(a);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
  });
  await page.waitForTimeout(400);
  await expect(tip).toBeHidden();
});

test('case study hero carries the project facts', async ({ page }) => {
  await page.goto('/case-study/turntide-website/');
  const facts = page.locator('.case-hero .case-facts');
  await expect(facts.locator('dt')).toHaveText(['Client', 'Services', 'Sector']);
  await expect(facts.locator('dd').first()).toHaveText('Turntide');
});

test('Services panel opens full width with services, SiteLaunch and BrandForge', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const toggle = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Services menu' });
  const panel = page.locator('#services-menu');
  await expect(panel.getByRole('link', { name: 'Rocket SiteLaunch' })).toBeHidden();
  await toggle.click();
  await expect(panel.getByRole('link', { name: 'Rocket SiteLaunch' })).toBeVisible();
  await expect(panel.getByRole('link', { name: /BrandForge/ })).toHaveAttribute('href', '/brandforge/');
  const box = await panel.boundingBox();
  expect(box!.width).toBeGreaterThan(1400);
});

test('FAQ accordions open and close with the keyboard', async ({ page }) => {
  await page.goto('/buckit/');
  const first = page.locator('.faq-item').first();
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('open', '');
  await page.keyboard.press('Enter');
  await expect(first).not.toHaveAttribute('open', '');
});
