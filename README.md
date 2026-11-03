# Founding Creative

The agency site for [foundingcreative.com](https://foundingcreative.com), built with Astro and deployed on Vercel. Project rules live in [CLAUDE.md](CLAUDE.md).

```bash
npm install
npm run dev        # local dev server
npm run build      # production build
npx playwright test
```

Copy `.env.example` to `.env.local` for local development. Real values live in Vercel env vars.

## Keeping it going

Work on a branch, open a pull request, and check the Vercel preview before merging. Every change follows CLAUDE.md: root-relative links, one H1, alt text on every image, no em dashes in copy, and Lighthouse mobile scores in the PR.

### Add a case study

A case study is one folder with one Markdown file. Everything else (the page, its card on `/case-studies/`, the "Next case study" module, the links to service pages, structured data, the sitemap) is built from it.

1. Create a folder at `src/content/case-studies/<slug>/`. The folder name becomes the URL: `/case-study/<slug>/`.
2. Add an `index.md` and put its images in the same folder. Copy the frontmatter from an existing case study (for example `turntide-website`) and fill in every field. The schema in `src/content.config.ts` fails the build if anything required is missing, including `coverAlt` and the SEO fields (`seoTitle` up to 60 characters, `description` up to 155, `ogTitle`, `ogDescription`).
3. Set `theme` (`accent`, `dark`, `light`) to the client's brand colors. They color the hero, the story's bands, the Results band, and this study's "Next case study" module on the study before it.
4. Set `services` using these tags: `Website`, `Interactive`, `Branding`, `Design`, `Events`. Each tag links the page to its service page ("See our website services"); the first tag is the main one.
5. Write the story below the frontmatter in this order. Each `##` heading starts a new band; a short line right above a `##` heading becomes that band's small label.
   - **Challenge:** `## The challenge`, a sentence, and a short list.
   - **Approach:** `### Our approach`, a sentence, and a short list (shown beside the challenge).
   - **What we built:** the line `What we built` (or `#### What we built`), then a `##` heading and what you made, followed by as many `##` bands as the work needs.
6. **Results:** when you have measured numbers, add `results` to the frontmatter (up to 4 `value`/`label` pairs) and a Results band appears after the story. Leave it out until the numbers are real.
7. **Testimonial:** add `testimonial` (`quote`, `name`, `role`) only with the client's approval. It shows after Results.
8. Give every image descriptive alt text. Run `npm run build` and `npx playwright test`.

### Add a blog post (Field Notes)

1. Create a folder at `src/content/posts/<slug>/`. The post is served at `/<slug>/`, so check the slug does not clash with a page.
2. Add an `index.md` with a `cover` image in the same folder. Copy the frontmatter from an existing post: `title`, SEO fields, `excerpt`, `date`, `updated`, `author`, `categories`, `cover`, `coverAlt`.
3. Start the body at `##`. The page title is the only H1.
4. The post shows up on `/blog/`, in the RSS feed at `/feed/` and in the sitemap automatically.

### Add a page

1. Create `src/pages/<slug>/index.astro`. Keep the trailing-slash folder pattern so the URL is `/<slug>/`.
2. Add the page to `pages` in `src/data/seo.ts` under its path (`'/<slug>/'`): title (60 characters max), description (155 max), and a share image at least 1200x630 with alt text. Wrap the page in `BaseLayout`; it picks the entry up by URL. Do not write head tags in the page itself.
3. Use one H1, the components in `src/components/`, and the tokens in `src/styles/global.css`. Use `<Image>` or `<Picture>` from `astro:assets` for raster images.
4. If it belongs in the menu, add it to `src/data/navigation.ts`.
5. If the page replaces or moves an old URL, add a 301 to `redirects` in `vercel.json`. Never delete a page or change a URL without one.
