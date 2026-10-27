import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Each entry is a folder with index.md and its images, so adding a post or
// case study is one new folder. The folder name is the URL slug.
const slugFromFolder = ({ entry }: { entry: string }) => entry.split('/')[0];

// SEO fields every page needs (CLAUDE.md). Kept separate from the visible
// title so search snippets can be tuned without changing the page.
const seo = {
  seoTitle: z.string().max(70),
  description: z.string().min(50).max(160),
  ogTitle: z.string(),
  ogDescription: z.string(),
};

const posts = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/posts', generateId: slugFromFolder }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      ...seo,
      excerpt: z.string(),
      date: z.coerce.date(),
      updated: z.coerce.date(),
      author: z.string(),
      categories: z.array(z.string()).min(1),
      cover: image(),
      coverAlt: z.string().min(1),
    }),
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/case-studies', generateId: slugFromFolder }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      ...seo,
      eyebrow: z.string(),
      headline: z.string(),
      subheadline: z.string(),
      clients: z.array(z.string()),
      sectors: z.array(z.string()),
      services: z.array(z.string()),
      date: z.coerce.date(),
      cover: image(),
      coverAlt: z.string().min(1),
      // White client logo, shown over the hero photo.
      logo: image().optional(),
      logoAlt: z.string().min(1).optional(),
    }),
});

export const collections = { posts, caseStudies };
