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

test('home services pin "We shape brands / launch websites / transform events / design everything" and swap on scroll', async ({ page }) => {
  await page.goto('/');
  const active = page.locator('[data-cycler] .cycler__word.is-active');
  const steps = page.locator('[data-cycler-step]');
  await expect(steps).toHaveCount(4);
  for (const [i, words] of ['shape brands', 'launch websites', 'transform events', 'design everything'].entries()) {
    await steps.nth(i).evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(active).toHaveText(words);
    await expect(steps.nth(i).getByRole('heading', { level: 3 })).toHaveText(`We ${words}`);
    // The pinned line and the H3 both link to the service page.
    const href = [
      '/services/branding-services/',
      '/services/website-services/',
      '/services/event-services/',
      '/services/design-services/',
    ][i];
    await expect(page.locator('[data-cycler-link]')).toHaveAttribute('href', href);
    await expect(steps.nth(i).getByRole('heading', { level: 3 }).getByRole('link')).toHaveAttribute('href', href);
    // No icon: the heading, one summary, then the pills over the button.
    await expect(steps.nth(i).locator('.service__text > *')).toHaveCount(3);
    const button = steps.nth(i).locator('.service__list > .button');
    await expect(button).toHaveText(
      ['View all brand services', 'View all website services', 'View all event services', 'View all design services'][i],
    );
    await expect(button).toHaveAttribute('href', href);
    // Case studies for the first three; the last is a short row without them.
    await expect(steps.nth(i).locator('.carousel')).toHaveCount(i < 3 ? 1 : 0);
    await expect(steps.nth(i).locator('.service__media .pill')).toHaveCount(0);
  }
  // Each pill links to its section on the service page.
  await expect(steps.first().getByRole('link', { name: 'Brand strategy' })).toHaveAttribute(
    'href',
    '/services/branding-services/#brand-strategy',
  );
  await expect(steps.nth(2).getByRole('link', { name: 'Directional signage' })).toHaveAttribute(
    'href',
    '/services/event-services/#directional-signage',
  );
  await expect(steps.nth(2).locator('.service__tags li')).toHaveText([
    'Interactive displays',
    'Animations',
    'Large-format prints and booths',
    'Directional signage',
    'Attendee badges',
    'Social media kits',
    'Promotional materials',
    'Event websites',
  ]);
  await expect(steps.nth(3).locator('.service__tags li')).toHaveText([
    'Digital marketing',
    'Print collateral',
    'Packaging',
    'Presentations',
    'Sales enablement',
  ]);
});

test('every home service pill lands on a section of its service page', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.locator('a.service__tag').evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
  expect(hrefs).toHaveLength(17);
  for (const href of hrefs) {
    await page.goto(href);
    const section = page.locator(`article#${href.split('#')[1]}`);
    await expect(section.getByRole('heading', { level: 3 })).toBeVisible();
    await expect(section.locator('img')).toHaveAttribute('alt', /\S/);
    await expect(section).toBeInViewport();
  }
});

test('the We build websites band stays off Home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'We build websites' })).toHaveCount(0);
});

test('BrandForge cards open one at a time and count down to the next', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/brandforge/');
  const cards = page.locator('[data-process-cards]');
  const toggles = cards.getByRole('button');
  await cards.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(toggles.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(cards.getByText('Stop guessing. Start knowing.')).toBeVisible();
  // The countdown hands over to card two on its own.
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true', { timeout: 10_000 });
  // Choosing a card opens it, closes the rest, and stops the countdown.
  await toggles.nth(3).click();
  await expect(toggles.nth(3)).toHaveAttribute('aria-expanded', 'true');
  await expect(cards.getByText('Launch the brand. Own the market.')).toBeVisible();
  await expect(cards.getByText('Define the path. Design the win.')).toBeHidden();
  await expect(cards).toHaveClass(/is-stopped/);
});

test('BrandForge steps: off Home, once as cards under the hero on BrandForge', async ({ page }) => {
  const titles = ['Discovery & Alignment', 'Strategy & Direction', 'Visual Identity', 'Activation'];
  await page.goto('/');
  await expect(page.locator('[data-process-cards]')).toHaveCount(0);
  // The closing "Your custom website starts here" card is gone too.
  await expect(page.getByRole('heading', { name: 'Your custom website starts here.' })).toHaveCount(0);

  await page.goto('/brandforge/');
  const band = page.getByRole('region', { name: 'How BrandForge works' });
  await expect(band.getByRole('heading', { level: 3 })).toHaveCount(4);
  await expect(band.locator('.process-card__title')).toHaveText(titles);
  // Once on the page, each with a described photo.
  await expect(page.locator('[data-process-cards]')).toHaveCount(1);
  await expect(page.locator('.process-split__step')).toHaveCount(0);
  for (const card of await band.locator('[data-process-card]').all()) await expect(card.locator('img')).toHaveAttribute('alt', /\S/);
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

test('Services panel opens full width with the services and BrandForge, no SiteLaunch', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const toggle = page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name: 'Services menu' });
  const panel = page.locator('#services-menu');
  await expect(panel.getByRole('link', { name: 'Event Services' })).toBeHidden();
  await toggle.click();
  await expect(panel.getByRole('link', { name: 'Event Services' })).toBeVisible();
  await expect(panel.getByRole('link')).toHaveCount(7);
  await expect(panel.locator('a[href*="sitelaunch"]')).toHaveCount(0);
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
