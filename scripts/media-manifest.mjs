// Match the media the ported pages use against a local copy of the WordPress
// uploads folder and write src/data/media-manifest.json.
//
// The library itself stays outside the repo. Only files listed in the
// manifest get copied into the site as each page is ported.
//
// Usage: npm run media -- /path/to/wp-content/uploads
//        (or set WP_UPLOADS_DIR)

import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const MEDIA_EXT = /\.(jpe?g|png|gif|webp|avif|svg|mp4|m4v|webm|pdf)$/i;
// WordPress derivatives: resized copies (photo-300x200.jpg) and the
// downscaled stand-in for large originals (photo-scaled.jpg).
const DERIVED = /-(\d+x\d+|scaled)(?=\.[a-z0-9]+$)/i;

const uploadsDir = process.argv[2] ?? process.env.WP_UPLOADS_DIR;
if (!uploadsDir) {
  console.error('Pass the uploads folder: npm run media -- /path/to/wp-content/uploads');
  process.exit(1);
}

const inventory = JSON.parse(await readFile(new URL('../src/data/wp-inventory.json', import.meta.url), 'utf8'));
const OUT = new URL('../src/data/media-manifest.json', import.meta.url);

async function sizeOf(file) {
  try {
    return (await stat(join(uploadsDir, file))).size;
  } catch {
    return null;
  }
}

// referenced file -> pages that use it
const usage = new Map();
for (const page of inventory.pages) {
  if (page.port !== 'port') continue;
  for (const file of page.media ?? []) {
    if (!MEDIA_EXT.test(file)) continue;
    if (!usage.has(file)) usage.set(file, new Set());
    usage.get(file).add(page.path);
  }
}

// Collapse derivatives onto the original, which Astro will resize itself.
const byOriginal = new Map();
for (const [file, pages] of usage) {
  const original = file.replace(DERIVED, '');
  const entry = byOriginal.get(original) ?? { referenced: new Set(), pages: new Set() };
  entry.referenced.add(file);
  for (const p of pages) entry.pages.add(p);
  byOriginal.set(original, entry);
}

const files = [];
for (const [original, { referenced, pages }] of byOriginal) {
  const originalSize = await sizeOf(original);
  // Fall back to the largest referenced copy when the original is missing.
  let use = originalSize !== null ? original : null;
  let size = originalSize;
  if (use === null) {
    for (const candidate of referenced) {
      const s = await sizeOf(candidate);
      if (s !== null && (size === null || s > size)) [use, size] = [candidate, s];
    }
  }
  files.push({
    file: use ?? original,
    inLibrary: use !== null,
    bytes: size,
    referencedAs: [...referenced].sort(),
    pages: [...pages].sort(),
  });
}
files.sort((a, b) => a.file.localeCompare(b.file));

const found = files.filter((f) => f.inLibrary);
const summary = {
  pagesScanned: inventory.pages.filter((p) => p.port === 'port').length,
  filesNeeded: files.length,
  inLibrary: found.length,
  missing: files.length - found.length,
  megabytes: Math.round(found.reduce((sum, f) => sum + f.bytes, 0) / 1e5) / 10,
};

await writeFile(
  OUT,
  JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), summary, files }, null, 2) + '\n',
);
console.log(summary);
for (const f of files.filter((f) => !f.inLibrary)) console.log(`missing: ${f.file} (${f.pages.join(', ')})`);
