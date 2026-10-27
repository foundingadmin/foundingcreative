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

// Service pages share one template (src/pages/services/[...slug].astro).
// Content lives in YAML with images in src/assets/services.
const services = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/services' }),
  schema: ({ image }) => {
    const pic = z.object({ src: image(), alt: z.string().min(1) });
    return z.object({
      path: z.string().regex(/^\/.*\/$/),
      ...seo,
      order: z.number(),
      name: z.string(),
      summary: z.string(),
      eyebrow: z.string(),
      title: z.string(),
      intro: z.string(),
      heroImages: z.array(pic).min(1),
      capabilities: z.array(z.object({ title: z.string(), items: z.array(z.string()).min(1) })),
      work: z.object({ heading: z.string(), intro: z.string(), caseStudies: z.array(z.string()).min(1) }),
      statement: z.object({
        lead: z.string().optional(),
        images: z.array(pic),
        heading: z.string(),
        body: z.array(z.string()).min(1),
      }),
      teams: z
        .object({
          eyebrow: z.string(),
          heading: z.string(),
          intro: z.string(),
          groups: z.array(
            z.object({ label: z.string(), heading: z.string(), text: z.string(), points: z.array(z.string()) }),
          ),
        })
        .optional(),
      showSiteLaunch: z.boolean().default(false),
      relatedPosts: z.array(z.string()).default([]),
      cta: z.object({ heading: z.string(), text: z.string() }),
    });
  },
});

export const collections = { posts, caseStudies, services };
