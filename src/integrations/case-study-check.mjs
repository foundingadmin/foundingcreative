// Build-time case study check (docs/case-study-sop.md, QA gate). Fails the
// build if a case study uses the same image twice in its body, whether as
// the same file or as a copy under another name. The cover (hero and share
// image) is the one exception: it may appear again.

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const IMAGE = /!\[[^\]]*\]\(\s*(\.\/[^)\s]+)|<(?:img|source|video)\b[^>]*?\b(?:src|poster)="(\.\/[^"]+)"/g;

/** @returns {Promise<string[]>} one message per repeated image */
export async function findRepeatedImages(dir) {
  const errors = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const folder = new URL(`${entry.name}/`, dir);
    let markdown;
    try {
      markdown = await readFile(new URL('index.md', folder), 'utf8');
    } catch {
      continue;
    }
    const cover = markdown.match(/^cover:\s*["']?(\.\/[^"'\s]+)/m)?.[1];
    const body = markdown.replace(/^---[\s\S]*?\n---/, '');
    const seen = new Map(); // content hash -> first path
    for (const match of body.matchAll(IMAGE)) {
      const path = match[1] ?? match[2];
      if (path === cover) continue;
      let hash;
      try {
        hash = createHash('sha1').update(await readFile(new URL(path, folder))).digest('hex');
      } catch {
        continue; // a missing file is Astro's error to report
      }
      const first = seen.get(hash);
      if (first === undefined) seen.set(hash, path);
      else errors.push(`${entry.name}: ${path} repeats ${first === path ? 'itself' : first}`);
    }
  }
  return errors;
}

export default function caseStudyCheck() {
  return {
    name: 'case-study-check',
    hooks: {
      'astro:build:start': async () => {
        const dir = new URL('../content/case-studies/', import.meta.url);
        const errors = await findRepeatedImages(dir);
        if (errors.length) {
          throw new Error(`Case study check failed. An image may appear once per page (the cover excepted):\n  ${errors.join('\n  ')}`);
        }
      },
    },
  };
}

// `node src/integrations/case-study-check.mjs` runs the check on its own.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = await findRepeatedImages(new URL('../content/case-studies/', import.meta.url));
  console.log(errors.length ? errors.join('\n') : 'No repeated images.');
  process.exitCode = errors.length ? 1 : 0;
}
