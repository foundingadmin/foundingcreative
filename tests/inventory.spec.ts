import { test, expect } from '@playwright/test';
import inventory from '../src/data/wp-inventory.json' with { type: 'json' };

// Checks every page marked `ported: true` in the WordPress inventory against
// the head values recorded from the live site. Pages not yet ported show up
// as fixme, so the test report doubles as the port checklist.
//
// INVENTORY_ALL=1 runs every HTML page regardless of `ported`. Point
// PLAYWRIGHT_BASE_URL at https://foundingcreative.com to check the inventory
// against the live site itself. The live site repeats some tags, so the
// one-per-page checks are skipped in that mode.

const runAll = process.env.INVENTORY_ALL === '1';
const auditingLive = (process.env.PLAYWRIGHT_BASE_URL ?? '').startsWith(inventory.source);

const pages = inventory.pages.filter(
  (p) => p.port === 'port' && p.status === 200 && p.contentType?.includes('text/html'),
);

const first = (values?: string[]) => values?.[0];

for (const entry of pages) {
  test(`matches WordPress: ${entry.path}`, async ({ page }) => {
    test.fixme(!runAll && !entry.ported, 'Not ported yet');

    const response = await page.goto(entry.path);
    expect(response?.status(), 'status').toBe(200);

    await expect(page, 'title').toHaveTitle(entry.title ?? '');

    const description = page.locator('meta[name="description"]');
    const canonical = page.locator('link[rel="canonical"]');
    const h1 = page.locator('h1');

    if (!auditingLive) {
      await expect(description, 'one meta description').toHaveCount(1);
      await expect(canonical, 'one canonical').toHaveCount(1);
      await expect(h1, 'one H1').toHaveCount(1);
    }

    // Some live pages (the legal pages) have no meta description. CLAUDE.md
    // still requires one, so the port only has to have a non-empty value there.
    const expectedDescription = first(entry.descriptions);
    if (expectedDescription !== undefined) {
      await expect(description.first(), 'meta description').toHaveAttribute('content', expectedDescription);
    } else if (!auditingLive) {
      await expect(description.first(), 'meta description').toHaveAttribute('content', /\S/);
    }

    await expect(canonical.first(), 'canonical').toHaveAttribute('href', first(entry.canonicals) ?? '');

    const expectedH1 = first(entry.h1s);
    if (expectedH1) {
      await expect(h1.first(), 'H1').toHaveText(expectedH1, { useInnerText: false });
    }

    for (const key of ['og:type', 'og:title', 'og:description', 'og:url'] as const) {
      const expected = first(entry.og?.[key]);
      if (expected !== undefined) {
        await expect(page.locator(`meta[property="${key}"]`).first(), key).toHaveAttribute('content', expected);
      }
    }
    // Image URLs change in the port (no more /wp-content/uploads), so only
    // check that an og:image exists where the live page had one.
    if (entry.og?.['og:image']?.length) {
      await expect(page.locator('meta[property="og:image"]'), 'og:image').not.toHaveCount(0);
    }
  });
}
