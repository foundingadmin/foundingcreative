// Every page's search and share metadata, in one place. src/components/SEO.astro
// reads it (through BaseLayout) to write the <head>; no page writes its own
// head tags.
//
// - Static pages are listed in `pages`, keyed by their URL path.
// - Collection pages (posts, case studies, services, SiteLaunch, legal) keep
//   their values in frontmatter, next to the content; `entrySeo` maps them.
// - Share title and description default to the page title and description.
//
// Values match the WordPress crawl. Sprint 2 rewrites the copy. The build
// check (src/integrations/seo-check.mjs, set up in astro.config.mjs) holds
// titles to 60 characters and descriptions to 155.

import type { ImageMetadata } from 'astro';
import type { Crumb } from '../lib/schema';
import web5 from '../assets/home/services/web-5.webp';
import web4 from '../assets/home/services/web-4.webp';
import brand2 from '../assets/home/services/brand-2.webp';
import brand3 from '../assets/home/services/brand-3.webp';
import brand4 from '../assets/home/services/brand-4.webp';
import genpactLaptop from '../assets/services/genpact-grow-website-laptop.webp';
import strategyLaptop from '../assets/services/brand-strategy-laptop.webp';
import buyinMagazine from '../assets/pages/buyin-playbook-magazine.webp';
import titus from '../assets/team/titus.webp';

export const site = {
  name: 'Founding Creative',
  locale: 'en_US',
  // Pages without their own share image use a Founding Creative project shot.
  image: web5,
  imageAlt: 'Turntide website designed by Founding Creative, shown on an iMac',
};

export interface PageSeo {
  title: string;
  description: string;
  /** Defaults to `title`. */
  shareTitle?: string;
  /** Defaults to `description`. */
  shareDescription?: string;
  /** Cropped to a 1200x630 JPEG for sharing. Defaults to `site.image`. */
  image?: ImageMetadata;
  imageAlt?: string;
  type?: 'website' | 'article';
  /** This page's name in its breadcrumb trail. Defaults to `shareTitle`,
   * then `title`. */
  crumb?: string;
  /** Pages between Home and this one in the breadcrumb trail. */
  parents?: Crumb[];
  /** Keep the page out of search results. Also add it to NOINDEX in
   * astro.config.mjs so the sitemap leaves it out. */
  noindex?: boolean;
}

export const pages: Record<string, PageSeo> = {
  '/': {
    title: 'Brand strategy and web design agency | Founding Creative',
    description:
      'Founding Creative builds the brand, website, and design system your team grows on. Strategy first, then work that earns trust and drives results.',
  },
  '/about-us/': {
    title: 'Meet the team | Founding Creative',
    description:
      'Josh Titus, Tyler Lukey, and a senior team of designers and strategists building creative foundations for brands that plan to grow.',
    crumb: 'About Us',
    image: titus,
    imageAlt: 'Josh Titus, Brand & Marketing Design at Founding Creative',
  },
  '/blog/': {
    title: 'Field Notes: Brand, Web & Design | Founding Creative',
    description:
      'Field Notes from Founding Creative: insights on brand strategy, website design, design systems, and creative leadership for marketers and founders.',
    shareTitle: 'Field Notes',
    // Share image: the featured (newest) post's cover, set by the page.
  },
  '/brandforge/': {
    title: 'BrandForge | Branding agency for startups',
    description:
      'Research-backed brand strategy and identity, built for people and AI search, and launch-ready in weeks instead of months.',
    crumb: 'BrandForge',
    parents: [{ name: 'Services', path: '/services/' }],
    image: strategyLaptop,
    imageAlt: 'Laptop showing a brand strategy framework and color wheel',
  },
  '/buckit/': {
    title: 'BucKit: Notion brand portal | Founding Creative',
    description:
      "BucKit is Founding Creative's Notion-based brand portal: one organized, searchable home for your brand assets, guidelines, projects, and files.",
    shareTitle: 'BucKit',
    image: brand3,
    imageAlt: 'Brand color palette swatches organized in a brand portal',
  },
  '/buyindeck/': {
    title: 'Free Website Buy-In Playbook | Founding Creative',
    description:
      'Get the free Website Buy-In Playbook: a ready-to-present deck that shows every team why a better website means better business.',
    shareTitle: 'Buy-in Deck',
    crumb: 'Website Buy-In Playbook',
    image: buyinMagazine,
    imageAlt: 'Website Buy-In Playbook shown as a printed magazine',
  },
  '/case-studies/': {
    title: 'Branding and web design case studies | Founding Creative',
    description:
      'Real results from brand, website, product, and event work, with the strategy behind each project and the outcomes it drove.',
    crumb: 'Case Studies',
    // Share image: the newest case study's cover, set by the page.
  },
  // Title and share title match the WordPress crawl. The live meta description
  // is broken plugin text ("Please enable JavaScript..."), so it is rewritten.
  '/contact-us/': {
    title: 'Contact Us - Founding Creative',
    description:
      "Tell us about your brand, website, or creative project. Send Founding Creative a message and we'll get back to you soon.",
    shareTitle: 'Contact Us',
    image: web4,
    imageAlt: 'Bank of America app on a tablet, designed by Founding Creative',
  },
  '/fractional-creative/': {
    title: 'Fractional creative director and team | Founding Creative',
    description:
      'Senior creative direction and a full design team on a monthly plan, without the cost of full-time hires. Priority access and roll-over benefits.',
    crumb: 'Fractional Creative',
    image: brand2,
    imageAlt: 'ATL Freight website on a laptop',
  },
  '/services/': {
    title: 'Creative design services | Founding Creative',
    description:
      'Brand strategy, websites, design, events, and animation from one senior team, so every piece of your brand works together. Find the right fit.',
    crumb: 'Services',
    image: genpactLaptop,
    imageAlt: 'Laptop showing the Genpact GROW18 event website',
  },
  '/site-care-plan/': {
    title: 'Website maintenance plans | Founding Creative',
    description:
      'Software updates, daily backups, and performance tuning handled by the team that built your site, so it stays fast and current.',
    crumb: 'Site Care Plan',
    imageAlt: 'Turntide website shown on an iMac',
  },
  '/tools/': {
    title: 'Free Brand Tools: FontSeek & VoiceSeek | Founding Creative',
    description:
      "Free tools from Founding Creative: FontSeek helps you find your brand's typography and VoiceSeek helps you find your brand's voice.",
    shareTitle: 'Tools',
    image: brand4,
    imageAlt: 'Hand-drawn logo sketches on graph paper',
  },
  '/404/': {
    title: 'Page not found - Founding Creative',
    description:
      "The page you're looking for has moved or no longer exists. Find our work, services, and Field Notes from here.",
    noindex: true,
  },
};

/** The SEO fields every collection entry carries in frontmatter (src/content.config.ts). */
interface EntrySeoFields {
  seoTitle: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
}

/** SEO for a collection page, from its frontmatter. */
export function entrySeo(
  data: EntrySeoFields,
  extra: Pick<PageSeo, 'image' | 'imageAlt' | 'type' | 'crumb' | 'parents'> = {},
): PageSeo {
  return {
    title: data.seoTitle,
    description: data.description,
    shareTitle: data.ogTitle,
    shareDescription: data.ogDescription,
    ...extra,
  };
}
