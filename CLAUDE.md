# Founding Creative Website

The agency site for Founding Creative (foundingcreative.com), rebuilt from WordPress + Pro/Cornerstone on WP Engine into a coded site.

## Mission

This site replaces the WordPress site at foundingcreative.com and must beat it on every measurable score:

- Lighthouse mobile 95+ on Performance, Accessibility, Best Practices and SEO
- LCP under 2.5s, CLS under 0.1

Round one is a port: same pages, same URLs, same design and copy as the live WordPress site. Technical fixes for performance, accessibility and SEO are in scope even when they touch markup or link text. A visual redesign or new copy waits until the port is live.

## Stack

- Astro (static output), deployed on Vercel (team: founding-creative-projects). Every branch gets a preview URL.
- Content in Markdown/YAML content collections, defined in `src/content.config.ts` and stored in `src/content/`.
- Contact form posts to Formspree (live form ID and a separate test form ID, both in env vars).
- Cookie consent gates all tracking scripts until the visitor opts in, with Google Consent Mode v2 defaulting to denied.
- Tests: Playwright (`tests/`), run in GitHub Actions locally and against the Vercel preview URL.
- Repo: github.com/foundingadmin/foundingcreative (main = production).
- Do not add a framework, CMS or UI library without asking. Prefer plain Astro components and CSS. Add any dependency only when it does substantial work, and say why.

## Where things live

- `astro.config.mjs`: `site`, `trailingSlash`, sitemap, self-hosted fonts, env schema
- `vercel.json`: redirects and rewrites (the redirect map), and response headers
- `src/layouts/BaseLayout.astro`: the one layout every page uses (head tags, header, footer)
- `src/components/`: shared Astro components
- `src/data/navigation.ts`: header, footer and legal menus
- `src/styles/global.css`: design tokens (colors, type scale, spacing)
- `src/lib/content.ts`: collection helpers and URL builders (`postUrl`, `caseStudyUrl`)
- `public/robots.txt`: robots rules and sitemap pointer

## Domain and URLs

- Canonical domain is https://foundingcreative.com, set as `site` in `astro.config.mjs`.
- `trailingSlash: 'always'`. Every URL ends in a slash, matching WordPress.
- Internal links and asset paths are always root-relative (`/about-us/`), never absolute `vercel.app` or `foundingcreative.com` URLs.
- Match the existing WordPress slugs exactly. Never delete a page or change a URL without adding a 301 to the redirect map in `vercel.json`.

## Search indexing (until cutover)

Nothing but foundingcreative.com may be indexed. Two guards do this:

1. **Header.** `vercel.json` sends `X-Robots-Tag: noindex, nofollow` on every response whose host is not exactly `foundingcreative.com`. That covers preview URLs, `foundingcreative.vercel.app` and any other alias.
2. **Meta tag.** `BaseLayout.astro` renders `<meta name="robots" content="noindex, nofollow">` on every page unless the build has `VERCEL_ENV=production`. Preview and local builds are always noindex.

At cutover, nothing needs to change in the code: once foundingcreative.com points at the Vercel project, the production build serves without the header or the meta tag, and `vercel.app` stays noindexed. Check after cutover with `curl -sI https://foundingcreative.com/ | grep -i x-robots` (no output expected) and view source for no robots meta. If `www.foundingcreative.com` ever serves pages instead of redirecting to the apex domain, it stays noindexed by design.

## Site map

- Home, About (`/about-us/`), Fractional Creative, Contact, Let's talk (`/coffee/`, redirects to the scheduler)
- 6 service pages (Branding and Strategy at `/brandforge/`, the rest under `/services/`)
- 3 SiteLaunch package pages (Rocket, Prism, Orbit)
- Case Studies index + case studies at `/case-study/<slug>/` (content collection)
- Field Notes blog index at `/blog/`, posts at `/<slug>/` (content collection), RSS at `/feed/`
- Legal: Imprint, Cookie Policy, Disclaimer, Privacy Statement (EU, UK, US variants)

## SEO and head tags

- Every page's title, meta description, canonical, robots, Open Graph and Twitter tags and JSON-LD are written by `src/components/SEO.astro`, which `BaseLayout` renders. No page writes its own head tags.
- Values live in `src/data/seo.ts`. Static pages have an entry in `pages`, keyed by path (`'/about-us/'`); `BaseLayout` finds it by URL. Collection pages (posts, case studies, services, SiteLaunch, legal) keep `seoTitle`, `description`, `ogTitle`, `ogDescription` in frontmatter and pass `seo={entrySeo(data, { image, imageAlt })}`. A page passes `seo` for anything only known at build time (the blog index's featured cover).
- Share title and description default to the page title and description. Share images are center-cropped to 1200x630 JPEG; use a source at least 1200px wide and 630px tall or it comes out smaller.
- The build fails if a page has no description or not exactly one H1 (`src/integrations/seo-check.mjs`, set up in `astro.config.mjs`). Titles over 60 characters and descriptions over 155 are warnings until Sprint 2 rewrites the copy, then `enforceLengths: true` makes them errors too.
- Keep values matching the WordPress crawl unless told otherwise. A noindex page is marked in `seo.ts` and added to `NOINDEX` in `astro.config.mjs`.
- Structured data is one JSON-LD `@graph` per page, assembled in `SEO.astro` from `src/lib/schema.ts`: the Organization (in full, as Organization + ProfessionalService, on Home only; a short form elsewhere so references resolve), the WebSite on every page, and a BreadcrumbList on every page below Home (built from the page's `crumb` and `parents` in `seo.ts` or `entrySeo`). Pages pass only their own nodes as `jsonLd` (Service, BlogPosting, CreativeWork, FAQPage...) and refer to the Organization as `{ '@id': organizationId(site) }`. Never add a second WebSite, Organization or BreadcrumbList.
- FAQPage only where the questions and answers are visible on the page. No street address or phone in the Organization until we have real ones.
- Validate new page types at validator.schema.org (0 errors, 0 warnings).
- One H1 per page. Eyebrow labels above headings are styled `<p>` or `<span>`, never heading tags.

## Images and links

- Every `<img>` has meaningful alt text, or `alt=""` only when purely decorative.
- Render every image with `src/components/Img.astro`. It wraps `astro:assets`: raster images become `<Picture>` with AVIF and WebP, SVGs stay `<Image>`. Give it `widths` and `sizes` (or a fixed `width`/`height`) so the browser picks the right file. Raster images live in `src/assets/` or next to their content entry, never in `public/`.
- Images below the fold lazy-load (the default). The one LCP image per page gets `loading="eager"` and `fetchpriority="high"`, and is passed to `BaseLayout` as `lcpImage` for a preload. Keep its widths and sizes in `src/lib/images.ts` so the preload and the `<Picture>` request the same file.
- Content above the fold animates with `data-intro` (pure CSS), never `data-reveal` (waits for a script, delays LCP).
- Background video sits over a poster image and only downloads after the page loads (`HeroBackdrop` `variant="video"`).
- Links describe their destination ("See the Turntide case study", not "Learn more"). If the visible text has to stay short, add visually hidden text that names the destination.

## Brand

- Fonts: Gelica (display, from the Adobe Fonts kit, which has to be served by Adobe), Manrope (body, self-hosted by Astro). Gelasio is part of the brand but not loaded on the site; ask before adding it.
- The Adobe kit stylesheet loads without blocking render. Headings show in "Gelica Fallback" (Georgia resized to Gelica's metrics, in `global.css`) until Gelica arrives. If Gelica's weights change, re-measure the fallback. The kit itself is set to Font display: swap in Adobe Fonts (Web Projects); keep it there, or Gelica headings blink out while the font downloads.
- Accent: mint `#7ef893` (`--color-mint`).
- The product name is always spelled BrandForge.
- Copy style: never use em dashes. Use commas, periods, or parentheses instead.
- Use the design tokens in `src/styles/global.css`. Don't hard-code colors or font sizes in components.

## Accessibility

Required: semantic HTML, alt text on every image, visible focus states, keyboard-usable nav and dropdowns, AA contrast.

## Rules for Claude

- Work on a branch, never commit straight to main. Open a pull request for review.
- Keep changes scoped to what was asked. If a change touches anything outside the request, stop and say so first.
- Never edit the contact form handler, the Formspree wiring, or the consent/tracking scripts unless the request explicitly names them.
- No secrets in the repo (it is public). Form IDs and keys live in Vercel env vars and `.env.local`, which is gitignored. Document new variables in `.env.example`.
- Before calling a task done:
  1. Run `npm run build` and fix every warning.
  2. Run `npx playwright test`.
  3. Run Lighthouse (mobile) on the changed pages against the Vercel preview.
  4. Report the results, and put the Lighthouse scores in the PR description with before and after numbers.

## Commands

- `npm run dev` local dev server
- `npm run build` production build
- `npx playwright test` run tests
- `npm run crawl` re-crawl the live WordPress site into `src/data/wp-inventory.json`
