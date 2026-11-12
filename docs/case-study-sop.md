# Case study SOP v2

The work splits into two halves. Cowork (this project) researches and writes one brief file. Claude Code builds the page, makes the images and runs a visual QA gate before opening a PR. A new case study then needs one line: "Build the case study in briefs/<client>.md."

## Part A: the brief (Cowork)

1. **Inputs:** client name, client site URL, project Drive folder, and what FC delivered.
2. **Split:** brand and website get separate, cross-linked pages when both were delivered.
3. **Facts** from Drive, Gmail and the live client site. Mark anything inferred "confirm". Scope is only what FC built.
4. **Quotes:** public reviews (Trustpilot) are usable as is. Email lines need the client's OK, so draft the ask and leave it as a draft.
5. **Copy** in the house structure: eyebrow, H1, subhead (110 to 120 characters, also the card excerpt), lead, The challenge (3), Our approach (3), The process (10 to 12), feature sections, Conclusion, Key outcomes (3), quote, cross-link. **Feature sections hold 2, 3 or 4 items, and the layout matches the count.** No credits, no em dashes, no invented numbers.
6. **SEO:** long-tail primary phrase tied to a service page target, checked in Ubersuggest. Title 60 characters max, description 155 max.
7. **Theme:** primary, light, accent and neutral hex codes from the client's brand guide.
8. **Image plan:** list every slot with its source (Drive file, live URL or "generate"). Each image is used once per page, except the hero and share image.
9. **Brand kit** (showcase pages): colors (name, hex, role, and CMYK from the brand guide if it gives one), fonts and weights, the logo and pattern files, up to four stats with their source, and a line on the brand's motif.
10. **Shot list** (showcase pages): 8 to 12 big visuals in order, each with its module (see "Showcase template v3"), its source file or "generate", and the one heading and 40 to 60 words that go with it.
11. **Flags:** typos in mockups, broken client links, client's-client logos, scope claims.
12. **Review:** Tyler edits, then exports the doc as Markdown to `briefs/<client>.md`.

## Part B: the build (Claude Code)

1. **Read** CLAUDE.md, this SOP and the brief. Reuse the existing case study collection, theme fields and Events or service filters.
2. **Build** the entry or entries with copy word for word from the brief.
3. **Images** through the pipeline below.
4. **SEO:** seo.ts entry, CreativeWork and BreadcrumbList schema, internal links with descriptive text, alt text on every image.
5. **QA gate** (below), then a PR with the Vercel preview. Never merge without Tyler.

## Image pipeline

The rule: **AI never draws the client's UI or logo.** Nano Banana builds the scene. A script pastes real screenshots onto the screens, so every pixel of the website is true.

1. **Capture.** Use Playwright at 2x, 1440 and 390 wide. Scroll the full page first so lazy images and reveal animations load. Hide cookie banners with CSS and wait for fonts.
2. **Scene.** The Gemini image model (GEMINI_IMAGE_MODEL, currently Nano Banana 2.1) makes 4 variants at 2K, 16:9. Template prompt: photoreal 3D studio shot; laptop and phone both fully in frame; phone in front, overlapping the laptop's lower-right corner; screens a flat pure #00FF00; background in the client's primary color; soft studio light; no text or logos.
3. **Composite.** Detect each green screen's four corners, perspective-warp the real screenshot into it, then add a soft glare layer.
4. **Pick.** Save all variants to `review/<client>/`. Reject any with a cropped device, a phone behind the laptop, or unreadable UI text at 100%. Tyler or Claude Code picks the winner.
5. **Brand scenes (optional).** Nano Banana can use the logo and mockup PNGs as references for in-the-wild shots, like a road case backstage or crew hoodies at a booth. Zoom to 100% and reject any distorted mark. These are art direction, so don't caption them as real events.
6. **Export** AVIF and WebP: hero 2400px wide or more, gallery images 1600px or more, share image 1200x630 JPG.

**Key handling:** GEMINI_API_KEY lives in `.env.local`, which is gitignored. Scripts run locally, never in the Vercel build. Never paste the key into a chat. Cost is about 5 cents per 2K image, so under $2 per case study.

**No key yet:** the same capture plus flat device frames composed with sharp, under the same reject rules.

## Showcase template v3

Image-led pages: big visuals carry the story and the copy stays short. A case study opts in by adding `brandKit` and `showcase` to its frontmatter (schema in `src/content.config.ts`, modules in `src/components/showcase/Showcase.astro`). The Markdown body keeps only the lead and The challenge; everything after it is a list of modules.

**Copy diet:** one heading and 40 to 60 words per section. The process is a collapsed "Full scope" list. A page tops out around 400 words outside that list, with 8 to 12 big visuals.

| Module (`type`) | What it does | Reads |
| --- | --- | --- |
| `statement` | One sentence, huge, on the client's primary color | `text` |
| `board` | Brand guide pages in a tilted grid that runs off both edges | 4 to 9 page images |
| `colors` | Tall swatches that rise into place, labeled with name, role, hex and RGB | `brandKit.colors` |
| `logo` | The logo wipes in on the client's color | `logo` |
| `mockup` | One to three mockups, edge to edge | images, `tone` |
| `scene` | A person using the real work; `concept: true` adds a "Concept" label | one image |
| `device` | The full-page capture scrolls inside a laptop as the page scrolls | full-page capture |
| `numbers` | The brand kit's stats, large, with a credit line | `brandKit.stats` |
| `scope` | The long process list, collapsed | `steps` |
| `conclusion` | Conclusion beside Key outcomes | paragraphs, outcomes |

`hero` sets the page's opening image when it differs from the cover, which stays the card and share image.

**Scenes:** `scripts/case-study-scene.mjs scene` has `laptop-in-hands`, `phone-in-hand` and `crew-backs`. Screens and print panels are flat green, and the real screenshot or logo is composited on. Save four variants per scene to `review/<client>/v3/` and wait for Tyler's picks.

Motion is CSS only: scroll timelines where the browser has them, still everywhere else and under `prefers-reduced-motion`.

Not built yet: the cutout hero over the client's pattern, the live type specimen, the logo micro animation, the interaction clip and the patterned next-case band. Each needs a source file or a decision first (see the PR that added this section).

## QA gate (Claude Code checks each page at 1440 and 390, fixes, then checks again)

- No image appears twice on a page, except the hero and share image.
- Every grid row is full. Card count matches the column count.
- Devices are fully in frame, the phone sits in front, and UI text is readable at 100%.
- No image under 1600px wide, blurry or a placeholder.
- Copy matches the brief. No em dashes.
- Claims stay inside FC's scope. None of the client's clients' logos appear.
- Every link resolves, including the external client link.
- Title is 60 characters or less, description is 155 or less, there is one H1, and the schema validates.
- Lighthouse mobile is 95+ on all four scores, with LCP under 2.5s.
- Before and after screenshots are in the PR.

## After launch

Request indexing in Search Console. Share on LinkedIn and tag the client. If the client has no public review yet, add them to the Trustpilot ask list.
