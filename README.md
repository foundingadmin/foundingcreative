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

1. Create a folder at `src/content/case-studies/<slug>/`. The folder name becomes the URL: `/case-study/<slug>/`.
2. Add an `index.md` and put its images in the same folder. Copy the frontmatter from an existing case study (for example `turntide-website`) and fill in every field. The schema in `src/content.config.ts` fails the build if anything required is missing, including `coverAlt` and the SEO fields (`seoTitle`, `description`, `ogTitle`, `ogDescription`).
3. Write the story in Markdown below the frontmatter. Give every image descriptive alt text.
4. The case study shows up on `/case-studies/` and in the sitemap automatically.

### Add a blog post (Field Notes)

1. Create a folder at `src/content/posts/<slug>/`. The post is served at `/<slug>/`, so check the slug does not clash with a page.
2. Add an `index.md` with a `cover` image in the same folder. Copy the frontmatter from an existing post: `title`, SEO fields, `excerpt`, `date`, `updated`, `author`, `categories`, `cover`, `coverAlt`.
3. Start the body at `##`. The page title is the only H1.
4. The post shows up on `/blog/`, in the RSS feed at `/feed/` and in the sitemap automatically.

### Add a page

1. Create `src/pages/<slug>/index.astro`. Keep the trailing-slash folder pattern so the URL is `/<slug>/`.
2. Wrap the page in `BaseLayout` and pass its title, description and share image. Do not write head tags in the page itself.
3. Use one H1, the components in `src/components/`, and the tokens in `src/styles/global.css`. Use `<Image>` or `<Picture>` from `astro:assets` for raster images.
4. If it belongs in the menu, add it to `src/data/navigation.ts`.
5. If the page replaces or moves an old URL, add a 301 to `redirects` in `vercel.json`. Never delete a page or change a URL without one.
