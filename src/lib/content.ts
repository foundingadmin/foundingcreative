import { getCollection, type CollectionEntry } from 'astro:content';

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

export const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
