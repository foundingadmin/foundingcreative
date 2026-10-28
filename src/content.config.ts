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

const hex = /^#[0-9a-f]{6}$/i;

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
      // Section colors from the live case study (see src/lib/case-study-bands.mjs).
      theme: z
        .object({
          accent: z.string().regex(hex),
          dark: z.string().regex(hex),
          light: z.string().regex(hex),
        })
        .optional(),
      // Show the SiteLaunch packages after the story (web projects).
      showSiteLaunch: z.boolean().default(false),
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

// SiteLaunch website packages (Prism, Rocket, Orbit), one YAML file each,
// rendered by src/components/SiteLaunchPage.astro.
const sitelaunch = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/sitelaunch' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      ...seo,
      order: z.number(),
      heroImage: image(),
      shareImage: image(),
      shareImageAlt: z.string().min(1),
      // Icon names are from src/components/Icon.astro (the build fails on an unknown one).
      pillars: z.array(z.object({ label: z.string(), icon: z.string() })).length(3),
      title: z.string(),
      subtitle: z.string(),
      audience: z.object({ heading: z.string(), lead: z.string(), points: z.array(z.string()).min(1) }),
      stats: z.array(z.object({ value: z.string(), label: z.string(), source: z.string().url().optional() })),
      why: z.object({ heading: z.string(), lead: z.string(), text: z.string() }),
      features: z.object({
        heading: z.string(),
        text: z.string(),
        lead: z.string(),
        items: z.array(z.object({ title: z.string(), text: z.string(), icon: z.string() })).length(6),
      }),
      process: z.object({
        heading: z.string(),
        text: z.string(),
        lead: z.string(),
        steps: z.array(z.object({ phase: z.string(), title: z.string(), text: z.string() })).length(4),
      }),
      closing: z.object({ heading: z.string(), text: z.string(), tagline: z.string() }),
      ctaHeading: z.string(),
    }),
});

// Legal pages (imprint, disclaimer, privacy statements, cookie policies),
// imported from the Complianz-generated WordPress pages.
const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    ...seo,
    updated: z.coerce.date(),
  }),
});

export const collections = { posts, caseStudies, services, sitelaunch, legal };
