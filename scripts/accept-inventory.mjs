// After a deliberate copy or metadata change, records the built site's head
// values as the expected ones in src/data/wp-inventory.json, so
// tests/inventory.spec.ts checks the new copy instead of the WordPress crawl.
// Only values that differ from the crawl become `overrides`.
//
//   npm run build && npm run inventory:accept
//
// Review the diff before committing: every change it records should be one
// you meant to make.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const file = new URL('../src/data/wp-inventory.json', import.meta.url);
const inventory = JSON.parse(readFileSync(file, 'utf8'));

const decode = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
const meta = (html, attr, name) => {
  const value = html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
  return value === undefined ? undefined : decode(value);
};

let changed = 0;
for (const entry of inventory.pages) {
  if (entry.port !== 'port' || !entry.ported) continue;
  const path = new URL(`../dist${entry.path}index.html`, import.meta.url);
  if (!existsSync(path)) continue;
  const html = readFileSync(path, 'utf8');

  const actual = {
    title: decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
    description: meta(html, 'name', 'description'),
    'og:title': meta(html, 'property', 'og:title'),
    'og:description': meta(html, 'property', 'og:description'),
    h1: text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ''),
  };
  const recorded = {
    title: entry.title,
    description: entry.descriptions?.[0],
    'og:title': entry.og?.['og:title']?.[0],
    'og:description': entry.og?.['og:description']?.[0],
    h1: entry.h1s?.[0],
  };

  const overrides = {};
  for (const [key, value] of Object.entries(actual)) {
    if (value !== undefined && value !== recorded[key]) overrides[key] = value;
  }
  const before = JSON.stringify(entry.overrides ?? {});
  if (Object.keys(overrides).length) entry.overrides = overrides;
  else delete entry.overrides;
  if (JSON.stringify(entry.overrides ?? {}) !== before) changed++;
}

writeFileSync(file, `${JSON.stringify(inventory, null, 2)}\n`);
console.log(`Updated overrides on ${changed} pages.`);
