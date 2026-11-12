// The case study image pipeline from docs/case-study-sop.md. The rule: AI
// never draws the client's UI or logo. The Gemini image model builds a studio
// scene of devices with flat green screens; this script then warps real
// screenshots (from scripts/capture-case-study.mjs) onto those screens.
//
//   node --env-file=.env.local scripts/case-study-scene.mjs scene <kind> <color> <out dir> [count]
//       kind: laptop-phone | two-phones. Writes <kind>-scene-1.png ... -N.png
//       and prints what the batch cost.
//
//   node scripts/case-study-scene.mjs composite <scene.png> <out.jpg> <screenshot> [<screenshot>...]
//       Screens are filled in order: largest first for laptop-phone (laptop,
//       then phone), left to right when the screens are a similar size.
//
// A dev tool, never part of the Vercel build. GEMINI_API_KEY and
// GEMINI_IMAGE_MODEL come from .env.local; the key is never printed.

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [command, ...args] = process.argv.slice(2);

// ---------------------------------------------------------------- scenes

const SCENES = {
  'laptop-phone': (color) =>
    `Photoreal 3D studio product shot, 16:9. A modern silver laptop, open and facing the camera almost straight on, and a modern smartphone standing upright. Both devices are completely inside the frame with generous empty margin on every side; nothing is cropped. The phone stands in front of the laptop, overlapping only the laptop's lower-right corner, and covers no more than the right quarter of the laptop screen. Both screens are switched on and show one flat, uniform, pure chroma green (#00FF00) with no reflections, no glare, no gradients, no icons and no notch or camera cutout. The background and floor are a seamless solid ${color}. Soft, even studio light with gentle contact shadows. No text, no logos, no people, no other objects.`,
  'two-phones': (color) =>
    `Photoreal 3D studio product shot, 16:9. Two identical modern smartphones standing upright side by side with a small gap between them, each turned at a slight angle, floating just above the surface. Both phones are completely inside the frame with generous empty margin on every side; nothing is cropped and the phones do not overlap. Both screens are switched on and show one flat, uniform, pure chroma green (#00FF00) with no reflections, no glare, no gradients, no icons and no notch or camera cutout. The background and floor are a seamless solid ${color}. Soft, even studio light with gentle shadows. No text, no logos, no people, no other objects.`,
};
// A different camera for each variant, so the four are real choices.
const ANGLES = [
  'Camera at eye level, straight on.',
  'Camera slightly above, looking down a little.',
  'Camera a little to the left, three-quarter view.',
  'Camera a little to the right and slightly above.',
];
// USD per million tokens, from the Gemini API pricing page (Nov 2026).
const PRICE = { input: 1.5, text: 7.5, image: 30 };

async function scene(kind, color, out, count = 4) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL;
  if (!key || !model) throw new Error('Set GEMINI_API_KEY and GEMINI_IMAGE_MODEL in .env.local');
  if (!SCENES[kind]) throw new Error(`Unknown scene kind: ${kind}`);
  mkdirSync(out, { recursive: true });

  let cost = 0;
  for (let n = 1; n <= count; n++) {
    const prompt = `${SCENES[kind](color)} ${ANGLES[(n - 1) % ANGLES.length]}`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '16:9', imageSize: '2K' } },
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(`Gemini: ${data.error.status} ${data.error.message}`);
    const image = data.candidates?.[0]?.content?.parts?.find((part) => part.inlineData);
    if (!image) throw new Error(`Gemini returned no image for variant ${n}`);
    const file = join(out, `${kind}-scene-${n}.png`);
    await sharp(Buffer.from(image.inlineData.data, 'base64')).png().toFile(file);

    const usage = data.usageMetadata ?? {};
    const imageTokens = usage.candidatesTokensDetails?.find((d) => d.modality === 'IMAGE')?.tokenCount ?? 0;
    const textTokens = (usage.candidatesTokenCount ?? 0) - imageTokens + (usage.thoughtsTokenCount ?? 0);
    const one = ((usage.promptTokenCount ?? 0) * PRICE.input + textTokens * PRICE.text + imageTokens * PRICE.image) / 1e6;
    cost += one;
    console.log(`saved ${file} ($${one.toFixed(4)})`);
  }
  console.log(`batch cost: $${cost.toFixed(2)} for ${count} images`);
}

// ------------------------------------------------------------- composite

/** How green a pixel is, 0 to 1: the screen's chroma key. */
const greenness = (r, g, b) => Math.max(0, Math.min(1, (g - Math.max(r, b) - 40) / 60));

/** Connected regions of key-green pixels, largest first. */
function findScreens(mask, width, height) {
  const labels = new Int32Array(width * height);
  const regions = [];
  const stack = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    const id = regions.length + 1;
    const pixels = [];
    stack.push(start);
    labels[start] = id;
    while (stack.length) {
      const p = stack.pop();
      pixels.push(p);
      const x = p % width;
      const y = (p - x) / width;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const q = ny * width + nx;
        if (mask[q] && !labels[q]) {
          labels[q] = id;
          stack.push(q);
        }
      }
    }
    regions.push({ id, pixels });
  }
  return { labels, regions: regions.sort((a, b) => b.pixels.length - a.pixels.length) };
}

/**
 * The four corners of a screen, even when another device hides one of them.
 * Fits the four straight outer edges to the region's outline and intersects
 * them. An edge only counts if the whole region lies on one side of it,
 * which rules out the edge of a phone standing in front.
 */
function screenCorners(region, labels, width, height) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height && labels[y * width + x] === region.id;
  const outline = [];
  for (const p of region.pixels) {
    const x = p % width;
    const y = (p - x) / width;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) outline.push([x, y]);
  }
  // A thinned sample of the region to test "all on one side" quickly.
  const sample = region.pixels.filter((_, i) => i % 97 === 0).map((p) => [p % width, Math.floor(p / width)]);

  let random = 12345;
  const rand = () => (random = (random * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

  const lines = [];
  let pool = outline;
  for (let found = 0; found < 4; found++) {
    let best = null;
    for (let tries = 0; tries < 4000; tries++) {
      const a = pool[Math.floor(rand() * pool.length)];
      const b = pool[Math.floor(rand() * pool.length)];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 40) continue;
      const nx = (b[1] - a[1]) / length;
      const ny = -(b[0] - a[0]) / length;
      const c = -(nx * a[0] + ny * a[1]);
      let left = 0;
      let right = 0;
      for (const [x, y] of sample) {
        const d = nx * x + ny * y + c;
        if (d > 3) left++;
        else if (d < -3) right++;
      }
      if (Math.min(left, right) > sample.length * 0.004) continue;
      let support = 0;
      for (const [x, y] of pool) if (Math.abs(nx * x + ny * y + c) < 1.6) support++;
      if (!best || support > best.support) best = { nx, ny, c, support };
    }
    if (!best) throw new Error('Could not find four straight screen edges');
    // Refine with a least-squares fit through the edge's own outline points.
    const on = pool.filter(([x, y]) => Math.abs(best.nx * x + best.ny * y + best.c) < 2.5);
    const mx = on.reduce((sum, p) => sum + p[0], 0) / on.length;
    const my = on.reduce((sum, p) => sum + p[1], 0) / on.length;
    let sxx = 0, sxy = 0, syy = 0;
    for (const [x, y] of on) {
      sxx += (x - mx) ** 2;
      sxy += (x - mx) * (y - my);
      syy += (y - my) ** 2;
    }
    const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
    const line = { nx: -Math.sin(angle), ny: Math.cos(angle) };
    line.c = -(line.nx * mx + line.ny * my);
    line.angle = angle;
    lines.push(line);
    // Drop this edge's points (and a margin) before looking for the next.
    pool = pool.filter(([x, y]) => Math.abs(line.nx * x + line.ny * y + line.c) > 6);
  }

  // Two pairs of roughly parallel edges; each corner is where one from each
  // pair meets.
  const flat = [...lines].sort((a, b) => Math.abs(Math.sin(a.angle)) - Math.abs(Math.sin(b.angle)));
  const [h1, h2, v1, v2] = flat;
  const meet = (p, q) => {
    const det = p.nx * q.ny - p.ny * q.nx;
    return [(p.ny * q.c - q.ny * p.c) / det, (q.nx * p.c - p.nx * q.c) / det];
  };
  const corners = [meet(h1, v1), meet(h1, v2), meet(h2, v1), meet(h2, v2)];
  const cx = corners.reduce((sum, p) => sum + p[0], 0) / 4;
  const cy = corners.reduce((sum, p) => sum + p[1], 0) / 4;
  const pick = (dx, dy) => corners.find((p) => Math.sign(p[0] - cx) === dx && Math.sign(p[1] - cy) === dy);
  const ordered = [pick(-1, -1), pick(1, -1), pick(1, 1), pick(-1, 1)];
  if (ordered.some((p) => !p)) throw new Error('Screen corners are not a clean quadrilateral');
  return ordered; // top left, top right, bottom right, bottom left
}

/** Homography that maps the unit square to the four corners. */
function squareToQuad([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

function invert3([a, b, c, d, e, f, g, h, i]) {
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
}

async function composite(sceneFile, outFile, shots) {
  const { data, info } = await sharp(sceneFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const mask = new Uint8Array(width * height);
  for (let p = 0; p < mask.length; p++) mask[p] = greenness(data[p * 3], data[p * 3 + 1], data[p * 3 + 2]) > 0.5 ? 1 : 0;

  const { labels, regions } = findScreens(mask, width, height);
  let screens = regions.slice(0, shots.length);
  if (screens.length < shots.length) throw new Error(`Found ${screens.length} green screens, need ${shots.length}`);
  // Screens of a similar size (two phones) are filled left to right.
  if (screens.at(-1).pixels.length > screens[0].pixels.length * 0.6) {
    const centre = (r) => r.pixels.reduce((sum, p) => sum + (p % width), 0) / r.pixels.length;
    screens = screens.sort((a, b) => centre(a) - centre(b));
  }

  // The green screens tint whatever is near them (a keyboard, a desk).
  // Take that spill out of everything that isn't screen.
  const out = Buffer.from(data);
  for (let p = 0; p < out.length; p += 3) {
    const limit = Math.max(out[p], out[p + 2]);
    if (out[p + 1] > limit) out[p + 1] = limit;
  }
  for (const [index, screen] of screens.entries()) {
    const corners = screenCorners(screen, labels, width, height);
    const [tl, tr, br, bl] = corners;
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    const w = Math.round((dist(tl, tr) + dist(bl, br)) / 2);
    const h = Math.round((dist(tl, bl) + dist(tr, br)) / 2);
    // A screen turned away from the camera looks narrower than it is, and the
    // warp accounts for that. So when the screenshot is close to the screen's
    // shape, use all of it; only crop (from the top) when it clearly isn't.
    const meta = await sharp(shots[index]).metadata();
    const stretch = meta.width / meta.height / (w / h);
    const fit = stretch > 0.75 && stretch < 1.33 ? 'fill' : 'cover';
    const shot = await sharp(shots[index]).resize(w, h, { fit, position: 'top' }).removeAlpha().raw().toBuffer();
    const toShot = invert3(squareToQuad(corners));

    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 2), x1 = Math.min(width - 1, Math.ceil(Math.max(...xs)) + 2);
    const y0 = Math.max(0, Math.floor(Math.min(...ys)) - 2), y1 = Math.min(height - 1, Math.ceil(Math.max(...ys)) + 2);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const p = (y * width + x) * 3;
        const alpha = greenness(data[p], data[p + 1], data[p + 2]);
        if (alpha === 0) continue;
        const q = toShot[6] * x + toShot[7] * y + toShot[8];
        const u = Math.min(1, Math.max(0, (toShot[0] * x + toShot[1] * y + toShot[2]) / q));
        const v = Math.min(1, Math.max(0, (toShot[3] * x + toShot[4] * y + toShot[5]) / q));
        // Bilinear sample of the screenshot.
        const fx = u * (w - 1), fy = v * (h - 1);
        const ix = Math.min(w - 2, Math.floor(fx)), iy = Math.min(h - 2, Math.floor(fy));
        const ax = fx - ix, ay = fy - iy;
        // A soft glare: brighter toward the screen's top left corner.
        const glare = 0.07 * Math.max(0, 1 - (u + v) / 1.1);
        for (let ch = 0; ch < 3; ch++) {
          const s00 = shot[(iy * w + ix) * 3 + ch], s10 = shot[(iy * w + ix + 1) * 3 + ch];
          const s01 = shot[((iy + 1) * w + ix) * 3 + ch], s11 = shot[((iy + 1) * w + ix + 1) * 3 + ch];
          let value = (s00 * (1 - ax) + s10 * ax) * (1 - ay) + (s01 * (1 - ax) + s11 * ax) * ay;
          value += (255 - value) * glare;
          // At the screen's edge the scene pixel is part bezel, part green:
          // take the green out before blending.
          out[p + ch] = Math.round(value * alpha + out[p + ch] * (1 - alpha));
        }
      }
    }
    console.log(`screen ${index + 1}: ${w}x${h}px, corners ${corners.map((c) => c.map(Math.round).join(',')).join(' ')}`);
  }

  await sharp(out, { raw: { width, height, channels: 3 } }).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toFile(outFile);
  console.log(`saved ${outFile} (${width}x${height})`);
}

if (command === 'scene') await scene(args[0], args[1], args[2], Number(args[3] ?? 4));
else if (command === 'composite') await composite(args[0], args[1], args.slice(2));
else throw new Error('Usage: case-study-scene.mjs scene <kind> <color> <out dir> [count] | composite <scene.png> <out.jpg> <screenshot>...');
