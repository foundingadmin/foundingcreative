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
  schema: ({ image }) => {
    // Showcase template v3 (docs/case-study-sop.md): image-led modules that
    // read the client's brand kit. Text takes **bold** and [links](/path/).
    const pic = z.object({ src: image(), alt: z.string().min(1) });
    // An SVG beside the entry ("./badge.svg"), inlined into the page.
    const svgFile = z.string().regex(/^\.\/[\w-]+\.svg$/);
    const point = z.object({ title: z.string(), text: z.string() });
    const copy = { kicker: z.string().optional(), heading: z.string().optional(), text: z.string().optional(), points: z.array(point).max(4).optional() };
    const block = z.discriminatedUnion('type', [
      // One sentence, huge, on the client's primary color.
      z.object({ type: z.literal('statement'), text: z.string() }),
      // Brand guide pages in a tilted, full-bleed grid.
      z.object({ type: z.literal('board'), ...copy, images: z.array(pic).min(4).max(9) }),
      // The brand kit's colors as tall swatches that rise into place.
      z.object({ type: z.literal('colors'), ...copy }),
      // The logo on the client's color. With a brand kit `mark`, the mark
      // builds itself piece by piece; otherwise the logo wipes in.
      z.object({ type: z.literal('logo'), ...copy }),
      // The full logo: an optional construction drawing (an SVG beside the
      // entry, inlined), then the logo in each approved color pairing.
      z.object({
        type: z.literal('lockups'),
        ...copy,
        construction: svgFile.optional(),
        constructionAlt: z.string().optional(),
        versions: z.array(z.object({ background: z.string().regex(hex), ink: z.string().regex(hex), label: z.string() })).min(2).max(4),
      }),
      // A big "Aa" and the brand font's weights, set in the site's own type.
      z.object({ type: z.literal('type'), ...copy }),
      // One to four mockups, edge to edge.
      z.object({ type: z.literal('mockup'), ...copy, images: z.array(pic).min(1).max(4), tone: z.enum(['light', 'white', 'dark']).default('light') }),
      // A person using the real work. `concept` adds a "Concept" label.
      z.object({ type: z.literal('scene'), ...copy, image: pic, concept: z.boolean().default(false) }),
      // A full-page capture that scrolls inside a laptop as the page scrolls.
      z.object({ type: z.literal('device'), ...copy, image: pic }),
      // A short silent loop of the real site in use, over its poster image.
      // `video` is a file in public/ ("/media/case-studies/<slug>/clip.mp4").
      z.object({ type: z.literal('clip'), ...copy, video: z.string().regex(/^\/media\/.+\.mp4$/), poster: pic }),
      // The brand kit's stats, large, on the client's color.
      z.object({ type: z.literal('numbers'), ...copy, credit: z.string().optional() }),
      // The long process list, collapsed.
      z.object({ type: z.literal('scope'), ...copy, label: z.string().default('Full scope'), steps: z.array(z.string()).min(1) }),
      z.object({ type: z.literal('conclusion'), paragraphs: z.array(z.string()).min(1), outcomes: z.array(point).min(1), after: z.string().optional() }),
    ]);
    return z.object({
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
      // A client quote, shown as a card right under the opening lead. The
      // portrait is a small square photo, shown in a circle.
      testimonial: z.object({ quote: z.string(), name: z.string(), role: z.string(), portrait: image().optional() }).optional(),
      // The client's brand kit, read by the showcase modules.
      brandKit: z
        .object({
          colors: z.array(z.object({ name: z.string(), hex: z.string().regex(hex), cmyk: z.string().optional(), role: z.string().optional() })).min(2),
          // `specimen` and `weightsArt` are the font drawn as SVG outlines
          // (scripts/font-specimen.mjs), so the type module shows the real
          // typeface without the page loading it.
          fonts: z
            .array(z.object({ name: z.string(), weights: z.array(z.string()).min(1), role: z.string().optional(), specimen: svgFile.optional(), weightsArt: svgFile.optional() }))
            .default([]),
          stats: z.array(z.object({ value: z.string(), label: z.string() })).max(4).default([]),
          // The brand pattern, behind the cutout hero and the next-case band.
          pattern: image().optional(),
          // The brand mark as an SVG beside the entry ("./badge.svg"). It is
          // inlined so its shapes can animate in, in the order they are drawn.
          mark: svgFile.optional(),
          // What makes the brand its own, for whoever art directs the page.
          motif: z.string().optional(),
        })
        .optional(),
      // The page's own hero image, when it differs from the cover (which
      // stays the card and share image).
      hero: pic.optional(),
      // A transparent cutout that floats over the brand kit's pattern in
      // the hero, in place of the cover or `hero`.
      heroCutout: pic.optional(),
      // Showcase modules, in order, shown after the Markdown body (the lead
      // and The challenge).
      showcase: z.array(block).optional(),
    });
  },
});

// Service pages share one template (src/pages/services/[...slug].astro).
// Content lives in YAML with images in src/assets/services.
const services = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/services' }),
  schema: ({ image }) => {
    const pic = z.object({ src: image(), alt: z.string().min(1) });
    // An SVG beside the entry ("./badge.svg"), inlined into the page.
    const svgFile = z.string().regex(/^\.\/[\w-]+\.svg$/);
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
