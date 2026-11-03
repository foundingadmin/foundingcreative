# Cutover: foundingcreative.com from WordPress to Vercel

Moves the domain from WP Engine to the Vercel project. The code needs no changes on the day: noindex switches off by itself once the site is served on foundingcreative.com (see CLAUDE.md, "Search indexing"), and GA4 only starts sending there.

Current setup (checked 2026-11-03):

| Record | Points to | At cutover |
|---|---|---|
| DNS host | GoDaddy (`ns71/ns72.domaincontrol.com`) | Edit records here |
| `@` A | WP Engine `141.193.213.10`, `141.193.213.11` | **Change** to Vercel |
| `www` CNAME | `foundingcreative.com` | **Change** to Vercel |
| MX (Google Workspace) | `aspmx.l.google.com` and alts | **Leave alone** (email) |
| TXT (SPF, Resend, 3× Google site verification) | | **Leave alone** |
| `fontseek` | Netlify | Leave alone |
| `voiceseek` | Netlify | Leave alone |
| `brand` | GitHub Pages | Leave alone |

## 1. The day before

- [ ] **TTL.** In GoDaddy DNS, lower the TTL on the `@` A records and the `www` record to 600 seconds (10 minutes), so the switch and any rollback spread fast.
- [ ] **Vercel env vars (Production).** `FORMSPREE_FORM_ID` (live form) and `GA_MEASUREMENT_ID` = `G-LTRSKXLP3S` are set. Production builds fail without the Formspree ID, so a green production deploy confirms it.
- [ ] **Formspree.** If the live form restricts submissions to certain domains, add `foundingcreative.com`.
- [ ] **Adobe Fonts.** The web project for kit `ooi7rue` lists `foundingcreative.com` and `www.foundingcreative.com`; if not, Gelica won't load there.
- [ ] **Google Tag Manager.** WordPress loads GTM container `GTM-PPZHLDSP`. The new site doesn't use GTM; it sends to GA4 `G-LTRSKXLP3S` directly. Open the container and check:
  - Does its GA4 tag use `G-LTRSKXLP3S`? If it uses a different ID, history will split.
  - Does it fire anything else (LinkedIn Insight, Meta or Google Ads pixels)? Those stop at cutover unless they're ported. List them and decide before cutover.
- [ ] **Final URL check** against production:
  ```
  npm run check-urls -- https://foundingcreative.vercel.app
  ```
  Every URL should load or redirect (98 at last count).
- [ ] **Backup.** Keep the WordPress site on WP Engine, reachable on its WP Engine URL (`*.wpengine.com`), for at least 30 days. Take a final backup in WP Engine before switching.

## 2. Switch

1. **Vercel › project › Settings › Domains.**
   - Add `foundingcreative.com`.
   - Add `www.foundingcreative.com` and set it to **redirect to `foundingcreative.com`** (308). Canonicals, the sitemap and all links use the apex domain.
   - Vercel shows the exact DNS values to use. Use those, not the ones remembered here.
2. **GoDaddy › DNS.**
   - Replace both `@` A records with Vercel's apex value (typically one A record, e.g. `76.76.21.21`; use what Vercel shows).
   - Change `www` to Vercel's CNAME (typically `cname.vercel-dns.com`).
   - Touch nothing else (MX, TXT, `fontseek`, `voiceseek`, `brand`).
3. **Wait** for Vercel to show both domains as valid with a certificate issued, usually minutes with the low TTL.

## 3. Right after (same day)

- [ ] **The real site is up.** It should show the new header, not WordPress; check `curl -sI https://foundingcreative.com/` for `x-vercel-id`.
- [ ] **Indexable.**
  - `curl -sI https://foundingcreative.com/ | grep -i x-robots-tag` prints nothing.
  - View source: no `<meta name="robots" content="noindex`.
- [ ] **www redirects:** `curl -sI https://www.foundingcreative.com/about-us/` should 308 to `https://foundingcreative.com/about-us/`.
- [ ] **URL check on the real domain:**
  ```
  npm run check-urls -- https://foundingcreative.com
  ```
- [ ] **Contact form.** Send a real test message from `/contact-us/` and confirm it arrives in Formspree.
- [ ] **GA4.**
  - Accept the cookie banner on foundingcreative.com, then check **Reports › Realtime** for your visit.
  - Click **Book a Meeting** and submit the form once.
  - Then in **Admin › Data display › Events**, mark `generate_lead` and `book_meeting` as key events.
- [ ] **Search Console** (property already verified by TXT):
  - **Sitemaps:** submit `https://foundingcreative.com/sitemap-index.xml`, and remove the old `sitemap_index.xml` (it now redirects).
  - **URL Inspection:** request indexing for Home, the service pages and the top case studies.
- [ ] **Sharing.** Paste a page into the LinkedIn Post Inspector (`linkedin.com/post-inspector`) to refresh its cached preview, and test one link in iMessage.
- [ ] **Lighthouse (mobile)** on Home and one service page against the real domain, to confirm the scores match the preview.

## 4. The following weeks

- [ ] **Search Console › Pages:** watch "Not found (404)" and "Page with redirect". Add any old URL that 404s to `scripts/legacy-urls.txt` and a redirect in `vercel.json`.
- [ ] **Vercel › Logs:** filter for 404s for the first week.
- [ ] **TTL:** raise it back to 1 hour once everything is stable.
- [ ] **WP Engine:** cancel the plan after 30 days with no rollback.
- [ ] **CLAUDE.md:** update the "Round one is a port" line now that the port is live, then start Sprint 3.

## Rollback

Put the `@` A records back to `141.193.213.10` and `141.193.213.11` and `www` back to `foundingcreative.com` in GoDaddy. With the 10-minute TTL, most visitors are back on WordPress within the hour. Nothing on the WordPress side changes during cutover, so it can serve again immediately.
