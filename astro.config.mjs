// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import caseStudyBands from './src/lib/case-study-bands.mjs';

// Pages that set `noindex` in BaseLayout; keep this list in sync.
const NOINDEX = ['/404/'];

// WordPress slugs all end in a trailing slash, so build every page as
// /slug/index.html and require the slash to keep URLs identical.
export default defineConfig({
  site: 'https://foundingcreative.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // sitemap-index.xml for search engines (listed in public/robots.txt).
  // Pages marked noindex in BaseLayout are left out here too.
  // Case studies get the live site's banded section layout at build time.
  markdown: {
    processor: satteri({ hastPlugins: [caseStudyBands] }),
  },
  integrations: [sitemap({ filter: (page) => !NOINDEX.some((path) => page.endsWith(path)) })],
  // Manrope is downloaded at build time and served from this site, so
  // visitors never request Google Fonts. Gelica is Adobe Fonts and has to
  // load from Adobe's kit (see BaseLayout).
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--font-manrope',
      weights: ['200 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    // Case study kickers ("USER JOURNEY MAPPING"), as on the live site.
    {
      provider: fontProviders.google(),
      name: 'Ubuntu Mono',
      cssVariable: '--font-ubuntu-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['monospace'],
    },
  ],
  env: {
    schema: {
      // Formspree form IDs end up in the page HTML, so they are public, but
      // they live in env vars (Vercel and .env.local) per CLAUDE.md.
      FORMSPREE_FORM_ID: envField.string({ context: 'server', access: 'public', optional: true }),
      FORMSPREE_TEST_FORM_ID: envField.string({ context: 'server', access: 'public', optional: true }),
    },
  },
});
