import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/content';

// Served at /feed/ (the WordPress feed URL) through a rewrite in vercel.json,
// so existing subscribers keep working.
export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'Founding Creative Field Notes',
    description:
      'Practical insights on brand strategy, website design, design systems, and creative leadership from Founding Creative.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.date,
      link: postUrl(post),
      categories: post.data.categories,
    })),
    customData: '<language>en-us</language>',
  });
}
