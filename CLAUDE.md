# Founding Creative Website

The agency site for Founding Creative (foundingcreative.com), being rebuilt from WordPress + Pro/Cornerstone on WP Engine into a coded site.

Round one is a **straight port**: same pages, same URLs, same design and copy as the live WordPress site. No redesign until the port is live.

## Stack

- Astro (static output), content in Markdown content collections
- Hosted on Vercel (team: founding-creative-projects). Every branch gets a preview URL.
- Repo: github.com/foundingadmin/foundingcreative (main = production)
- Contact form: Formspree (live form ID and a separate test form ID, both in env vars)
- Cookie consent: gates all tracking scripts until the visitor opts in, with Google Consent Mode v2 defaulting to denied
- Tests: Playwright, run in GitHub Actions against the Vercel preview URL

## Site map to port

- Home, About (/about-us/), Fractional Creative, Contact, Let's talk (/coffee/)
- 6 service pages (Branding and Strategy at /brandforge/, Design, Website, Event, Animation, Custom)
- 3 SiteLaunch package pages (Rocket, Prism, Orbit)
- Case Studies index + 10 case studies (content collection)
- Field Notes blog index + posts (content collection), RSS at /feed/
- Legal: Imprint, Cookie Policy, Disclaimer, Privacy Statement

Match the existing WordPress slugs exactly. Any URL that has to change gets a 301 in the redirect config.

## Rules for Claude

- Work on a branch, never commit straight to main. Open a pull request for review.
- Keep changes scoped to what was asked. If a change touches anything outside the request, stop and say so first.
- Never edit the contact form handler, the Formspree wiring, or the consent/tracking scripts unless the request explicitly names them.
- Run `npm run build` and the Playwright tests before saying a task is done, and report the results.
- No secrets in the repo (it is public). Form IDs and keys live in Vercel env vars and `.env.local`, which is gitignored.
- Copy style: never use em dashes. Use commas, periods, or parentheses instead.
- Accessibility is required: semantic HTML, alt text on every image, visible focus states, keyboard-usable nav and dropdowns, AA contrast.
- Every page needs a title, meta description, one H1, canonical URL, and Open Graph tags. Keep values matching the WordPress crawl unless told otherwise.
- Use the design tokens in the global stylesheet. Don't hard-code colors or font sizes in components.
- Prefer plain Astro components and CSS. Add a dependency only when it does substantial work, and say why.

## Commands

- `npm run dev` local dev server
- `npm run build` production build
- `npx playwright test` run tests
