// @ts-check
import { defineConfig } from 'astro/config';

// WordPress slugs all end in a trailing slash, so build every page as
// /slug/index.html and require the slash to keep URLs identical.
export default defineConfig({
  site: 'https://foundingcreative.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
