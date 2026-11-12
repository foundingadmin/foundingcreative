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
      // When the work was made (YYYY or YYYY-MM), if that differs from the
      // publish date. Goes into the structured data only.
      created: z.string().regex(/^\d{4}(-\d{2})?$/).optional(),
      // The client's website, for the structured data.
      clientUrl: z.string().url().optional(),
      // The case study the "Next case study" band links to (its folder
      // name). Without it, the next one by date.
      next: z.string().optional(),
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
      // Measured outcomes, shown as a Results band after the story. Leave out
      // until there are real numbers; the band only appears when set.
      results: z
        .array(z.object({ value: z.string(), label: z.string() }))
        .min(1)
        .max(4)
        .optional(),
      // A client quote, shown after Results when one exists.
      testimonial: z.object({ quote: z.string(), name: z.string(), role: z.string() }).optional(),
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
      capabilitiesHeading: z.string().default('Capabilities'),
      capabilities: z.array(z.object({ title: z.string(), items: z.array(z.string()).min(1) })),
      // How a project runs, shown as numbered steps (ProcessTimeline).
      process: z
        .object({
          heading: z.string(),
          steps: z.array(z.object({ name: z.string(), text: z.string() })).min(3).max(6),
        })
        .optional(),
      // The parts of the service, each a section with its own anchor (#id).
      // The homepage's service pills come from here: `label` is the pill and
      // it links to `id` on this page. Changing an id breaks links to it.
      areas: z
        .object({
          heading: z.string(),
          items: z
            .array(
              z.object({
                id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
                label: z.string(),
                // What it is, then how we do it.
                what: z.string(),
                how: z.string(),
                image: pic,
              }),
            )
            .min(1),
        })
        .optional(),
      work: z.object({ heading: z.string(), intro: z.string(), caseStudies: z.array(z.string()).min(1) }),
      statement: z.object({
        lead: z.string().optional(),
        images: z.array(pic),
        heading: z.string(),
        // Paragraphs; [text](/path/) becomes a link.
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
      // Show the BrandForge pitch for startups (branding services).
      showBrandForge: z.boolean().default(false),
      relatedPosts: z.array(z.string()).default([]),
      cta: z.object({ heading: z.string(), text: z.string() }),
    });
  },
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

export const collections = { posts, caseStudies, services, legal };
