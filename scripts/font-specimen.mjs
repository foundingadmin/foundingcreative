// Draws a client's typeface as SVG outlines for the showcase `type` module,
// so a case study shows the real font without the page loading it.
//
//   node scripts/font-specimen.mjs <font.ttf> <case study folder> [Name:weight ...]
//
// Writes type-aa.svg (a bold "Aa") and type-weights.svg (each weight's name,
// set in that weight). Needs a variable font with a wght axis. Name them in
// the entry's brand kit: fonts[0].specimen and fonts[0].weightsArt.
// A dev tool, not part of the build. Check the font's license allows outlines
// (open-source fonts like Mulish do).

import { create } from 'fontkitten';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [fontPath, outDir, ...pairs] = process.argv.slice(2);
if (!fontPath || !outDir) throw new Error('Usage: node scripts/font-specimen.mjs <font.ttf> <case study folder> [Name:weight ...]');
const weights = (pairs.length ? pairs : ['Regular:400', 'Medium:500', 'Bold:700', 'Black:900']).map((pair) => {
  const [name, weight] = pair.split(':');
  return { name, weight: Number(weight) };
});

const font = create(readFileSync(fontPath));
const round = (n) => Math.round(n * 10) / 10;

/** A word's glyph paths side by side (y still points up), and its box. */
function word(text, weight, startX = 0) {
  const face = font.getVariation({ wght: weight });
  let x = startX;
  let [top, bottom] = [0, 0];
  const paths = [];
  for (const glyph of face.glyphsForString(text)) {
    const d = glyph.path.toSVG();
    if (d) paths.push(`<path transform="translate(${round(x)} 0)" d="${d}"/>`);
    top = Math.max(top, glyph.bbox.maxY);
    bottom = Math.min(bottom, glyph.bbox.minY);
    x += glyph.advanceWidth;
  }
  return { paths, end: x, top, bottom };
}

/** Flip to SVG's y-down and crop to the ink. */
function svg(words, label) {
  const top = Math.max(...words.map((w) => w.top));
  const bottom = Math.min(...words.map((w) => w.bottom));
  const width = Math.max(...words.map((w) => w.end));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${round(-top)} ${round(width)} ${round(top - bottom)}" fill="currentColor" role="img" aria-label="${label}">` +
    `<g transform="scale(1 -1)">${words.flatMap((w) => w.paths).join('')}</g></svg>\n`
  );
}

writeFileSync(join(outDir, 'type-aa.svg'), svg([word('Aa', 700)], `${font.familyName.replace(/ ExtraLight$/, '')} specimen: Aa`));

const gap = font.unitsPerEm * 0.9;
const row = [];
let x = 0;
for (const { name, weight } of weights) {
  const w = word(name, weight, x);
  row.push(w);
  x = w.end + gap;
}
writeFileSync(join(outDir, 'type-weights.svg'), svg(row, `Weights: ${weights.map((w) => w.name).join(', ')}`));
console.log('wrote type-aa.svg and type-weights.svg to', outDir);
