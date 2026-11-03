// Build-time SEO check. After every build it reads each generated page and
// fails the build if a page has no meta description or doesn't have exactly
// one <h1>. Titles over `title` characters and descriptions over
// `description` characters are listed as warnings, or fail the build too
// once `enforceLengths` is on (Sprint 2, when the copy is rewritten).
//
// Values come from src/data/seo.ts and collection frontmatter; this checks
// what actually shipped, so it also catches a page that skips BaseLayout.

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const decode = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** @param {{ title?: number, description?: number, enforceLengths?: boolean }} options */
export default function seoCheck({ title = 60, description = 155, enforceLengths = false } = {}) {
  return {
    name: 'seo-check',
    hooks: {
      'astro:build:done': async ({ dir, pages, logger }) => {
        const errors = [];
        const warnings = [];

        for (const { pathname } of pages) {
          const url = `/${pathname}`;
          const file = new URL(pathname === '404/' ? '404.html' : `${pathname}index.html`, dir);
          let html;
          try {
            html = await readFile(fileURLToPath(file), 'utf8');
          } catch {
            continue; // not an HTML page (feed.xml and the like)
          }

          const pageTitle = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
          const pageDescription = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
          const h1s = html.match(/<h1[\s>]/g)?.length ?? 0;

          if (!pageTitle) errors.push(`${url}: no <title>`);
          if (!pageDescription) errors.push(`${url}: no meta description`);
          if (h1s !== 1) errors.push(`${url}: ${h1s} <h1> elements (needs exactly 1)`);

          const lengths = enforceLengths ? errors : warnings;
          if (pageTitle.length > title) lengths.push(`${url}: title is ${pageTitle.length} characters (max ${title})`);
          if (pageDescription.length > description) {
            lengths.push(`${url}: description is ${pageDescription.length} characters (max ${description})`);
          }
        }

        if (warnings.length) {
          logger.warn(`${warnings.length} SEO length issues (fixed in Sprint 2):\n  ${warnings.join('\n  ')}`);
        }
        if (errors.length) {
          throw new Error(`SEO check failed on ${errors.length} issues:\n  ${errors.join('\n  ')}`);
        }
        logger.info(`SEO check passed on ${pages.length} pages.`);
      },
    },
  };
}
