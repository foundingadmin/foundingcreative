// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Pages that set `noindex` in BaseLayout; keep this list in sync.
const NOINDEX = ['/client-portal/'];

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
