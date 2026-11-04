import { test, expect } from '@playwright/test';

// Field Notes, case studies, RSS, and sitemap. Head values for each page are
// covered by inventory.spec.ts; these check the content and SEO extras.

test('Field Notes index lists every post, newest first', async ({ page }) => {
  await page.goto('/blog/');
  const cards = page.getByRole('main').getByRole('article');
  await expect(cards).toHaveCount(13);
  await expect(cards.first().getByRole('heading')).toHaveText('Marketing Agency, Creative Design Studio, or Something Else?');
  // One h1, ahead of every other heading.
  await expect(page.locator('h1')).toHaveCount(1);
  const firstHeading = await page.locator('main :is(h1, h2, h3)').first().evaluate((el) => el.tagName);
  expect(firstHeading).toBe('H1');
});

test('a post has its hero, body, structured data, and related posts', async ({ page }) => {
  await page.goto('/5-website-truths-for-marketers/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('5 Website Truths for Marketers');
  await expect(main.getByRole('heading', { name: /Slow Site = Leaky Funnel/ })).toBeVisible();
  await expect(main.locator('time').first()).toHaveAttribute('datetime', '2025-10-30');
  await expect(main.getByRole('heading', { name: 'More Field Notes' })).toBeVisible();

  const schema = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '[]');
  const types = schema['@graph'].flatMap((node: { '@type': string | string[] }) => node['@type']);
  expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'BlogPosting', 'BreadcrumbList']));

  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\.jpg$/);
  await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', /^2025-10-30/);
});

test('every post uses the same header, contents, and Field Notes module', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const boxes: number[][] = [];
  for (const slug of [
    '5-website-truths-for-marketers',
    '10-key-factors-to-consider-when-choosing-the-best-web-design-company-for-your-business',
    'the-missing-middle-ground-why-your-ai-needs-a-human-driven-creative-foundation',
  ]) {
    await page.goto(`/${slug}/`);
    const card = await page.locator('.post-card').boundingBox();
    boxes.push([Math.round(card!.y), Math.round(card!.height)]);
    // The contents list links to each section heading.
    const toc = page.getByRole('navigation', { name: 'In this article' });
    for (const href of await toc.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href')))) {
      await expect(page.locator(`[id="${href!.slice(1)}"]`)).toHaveCount(1);
    }
    // The shared module: a featured post and four more, never this post.
    const more = page.getByRole('region', { name: 'More Field Notes' });
    await expect(more.locator('.field-notes__item')).toHaveCount(4);
    await expect(more.locator(`a[href="/${slug}/"]`)).toHaveCount(0);
  }
  // Headers are the same size whatever the title's length.
  expect(new Set(boxes.map((b) => b.join('x'))).size).toBe(1);
});

test('cover cards rise over the curve so its dip tucks under them', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, band] of [
    ['/case-study/bell-bird-atm/', '.case-cover'],
    ['/5-website-truths-for-marketers/', '.post-page'],
  ]) {
    await page.goto(path);
    const { cardTop, curveTop } = await page.evaluate((sel) => {
      const section = document.querySelector(sel)!;
      const card = section.querySelector('.case-cover__card, .post-card')!;
      const curve = getComputedStyle(section, '::before');
      return {
        cardTop: card.getBoundingClientRect().top,
        curveTop: section.getBoundingClientRect().top - parseFloat(curve.height) + 1,
      };
    }, band);
    expect(cardTop).toBeLessThan(curveTop);
  }
});

test('case studies index and a case study page', async ({ page }) => {
  await page.goto('/case-studies/');
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(10);

  await page.goto('/case-study/bank-apps/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { level: 1 })).toHaveText('Multiple internal sectors, multiple solutions');
  await expect(main.getByText('Bank of America', { exact: true })).toBeVisible();
  // The numbered user journey became a real ordered list.
  await expect(main.locator('ol li').first()).toContainText('Business needs to access a PDF');
});

test('every content image has alt text', async ({ page }) => {
  for (const path of ['/blog/', '/case-studies/', '/case-study/genpact-grow-event/', '/5-website-truths-for-marketers/']) {
    await page.goto(path);
    const missing = await page.locator('main img').evaluateAll((imgs) =>
      imgs.filter((img) => !img.getAttribute('alt')?.trim()).map((img) => img.getAttribute('src')),
    );
    expect(missing, `images without alt on ${path}`).toEqual([]);
  }
});

test('RSS feed lists the posts', async ({ request }) => {
  // Vercel serves this at /feed/ (vercel.json rewrite), the WordPress feed URL.
  const response = await request.get('/feed.xml');
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  expect(xml).toContain('<title>Founding Creative Field Notes</title>');
  expect(xml.match(/<item>/g)).toHaveLength(13);
  expect(xml).toContain('https://foundingcreative.com/5-website-truths-for-marketers/');
});

test('sitemap and robots.txt', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://foundingcreative.com/sitemap-index.xml');
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  for (const url of ['/blog/', '/case-studies/', '/case-study/bank-apps/', '/5-website-truths-for-marketers/']) {
    expect(sitemap).toContain(`https://foundingcreative.com${url}`);
  }
});

test('home shows what we do, for whom, and proof on the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero.getByText('We\'re a brand strategy agency for growing B2B teams.', { exact: false })).toBeVisible();
  const clients = hero.getByRole('list', { name: 'Clients' });
  await expect(clients.getByRole('img')).toHaveCount(6);
  // The proof sits above the fold.
  const box = await clients.boundingBox();
  expect(box!.y + box!.height).toBeLessThan(900);
  await expect(page.locator('.year-stats .stat__value')).toHaveCount(4);
});

test('service pages explain their process and link two relevant case studies', async ({ page }) => {
  for (const [path, studies] of [
    ['/services/website-services/', ['/case-study/turntide-website/', '/case-study/atlfreight-website/']],
    ['/services/branding-services/', ['/case-study/bell-bird-atm/', '/case-study/safezone-product-and-branding/']],
    ['/brandforge/', ['/case-study/bell-bird-atm/', '/case-study/safezone-product-and-branding/']],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 2, name: /How .* works/ })).toBeVisible();
    const work = page.locator('#work-slider > li');
    await expect(work).toHaveCount(2);
    for (const href of studies) await expect(work.locator(`a[href="${href}"]`).first()).toBeAttached();
  }
  await page.goto('/services/branding-services/');
  await expect(page.getByRole('link', { name: 'BrandForge', exact: true })).toHaveAttribute('href', '/brandforge/');
});

test('Fractional Creative FAQ matches its FAQPage structured data', async ({ page }) => {
  await page.goto('/fractional-creative/');
  const questions = await page.locator('.fc-faq summary').allTextContents();
  expect(questions).toHaveLength(3);
  const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '')['@graph'];
  const faq = graph.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
  expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(questions.map((q) => q.trim()));
});

test('case studies follow challenge, approach, what we built, and link onward', async ({ page }) => {
  for (const [slug, service] of [
    ['turntide-website', '/services/website-services/'],
    ['bell-bird-atm', '/services/branding-services/'],
    ['innovation-forum-event', '/services/event-services/'],
  ]) {
    await page.goto(`/case-study/${slug}/`);
    const story = page.locator('.case-story');
    await expect(story.getByRole('heading', { name: 'The challenge' })).toBeVisible();
    await expect(story.getByRole('heading', { name: /approach/i }).first()).toBeAttached();
    await expect(story.getByText('What we built', { exact: true })).toBeAttached();
    // No Results band until real numbers are set in the frontmatter.
    await expect(page.locator('.case-results')).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Planning something similar?' }).locator(`a[href="${service}"]`)).toBeVisible();
    await expect(page.locator('.case-next__title a')).toHaveAttribute('href', /^\/case-study\/[a-z-]+\/$/);
  }
});
