import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type CaseStudy = CollectionEntry<'caseStudies'>;

const newestFirst = (a: { data: { date: Date } }, b: { data: { date: Date } }) =>
  b.data.date.getTime() - a.data.date.getTime();

export async function getPosts(): Promise<Post[]> {
  return (await getCollection('posts')).sort(newestFirst);
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
  return (await getCollection('caseStudies')).sort(newestFirst);
}

// Posts live at the site root (/<slug>/) and case studies under /case-study/,
// matching the WordPress URLs.
export const postUrl = (post: Post) => `/${post.id}/`;
export const caseStudyUrl = (study: CaseStudy) => `/case-study/${study.id}/`;

// The service page behind each case study service tag. Case study pages link
// back to these; the first tag is the study's main service.
const SERVICE_FOR_TAG: Record<string, string> = {
  Website: 'website-services',
  Interactive: 'website-services',
  Branding: 'branding-services',
  Design: 'design-services',
  Events: 'event-services',
};

/** The service pages behind a case study's service tags, main service first, without repeats. */
export async function servicesFor(study: CaseStudy) {
  const ids = [...new Set(study.data.services.map((tag) => SERVICE_FOR_TAG[tag]).filter(Boolean))];
  const entries = await Promise.all(ids.map((id) => getEntry('services', id)));
  return entries.filter((entry) => entry !== undefined);
}

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
