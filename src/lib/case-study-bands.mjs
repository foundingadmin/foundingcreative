// Sätteri (Astro's Markdown processor) plugin that turns a case study's flat
// Markdown into the live site's layout: full-width
// bands of alternating color, each holding one part of the story.
//
// - A new band starts at every H2. A short label right before an H2 (a
//   "#### The process" heading or a "user journey mapping" line) becomes
//   that band's kicker.
// - <p class="statement"> lines get a band of their own in the accent color.
// - Within a band: an H2 plus its opening paragraphs form the header; runs of
//   images become galleries; a heading with one or two images becomes a
//   text-and-media feature; runs of short text-only subsections become cards;
//   "The challenge" and its approach sit side by side.
// - Band tones follow the live pages: white intro, light challenge, accent
//   statement, dark band after it, then white, neutral, and light in turn,
//   with the conclusion on white. Colors come from each study's `theme`.
//
// Only runs on files in src/content/case-studies. It rebuilds the top level of
// the HTML tree directly, so it needs no tree utilities.
//
// Astro caches rendered Markdown and doesn't notice edits to this file. After
// changing it, delete node_modules/.astro (and .astro/data-store.json) before
// building or starting the dev server.

const el = (tagName, className, children = []) => ({
  type: 'element',
  tagName,
  properties: className ? { className: [className].flat() } : {},
  children,
});

const isElement = (node, ...tags) => node?.type === 'element' && (!tags.length || tags.includes(node.tagName));
const isBlank = (node) => node.type === 'text' && !node.value.trim();
const hasClass = (node, name) => [node?.properties?.className ?? []].flat().includes(name);
const textOf = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join('');

const MEDIA_TAGS = ['img', 'video', 'picture', 'svg', 'iframe'];

/** An image, a video, or a paragraph or box holding only those. */
function isMedia(node) {
  if (node.type === 'raw') return /^\s*<(video|img|iframe)\b/i.test(node.value);
  if (!isElement(node)) return false;
  if (MEDIA_TAGS.includes(node.tagName)) return true;
  if (node.tagName === 'p' || hasClass(node, 'on-dark')) {
    const kids = node.children.filter((child) => !isBlank(child));
    return kids.length > 0 && kids.every(isMedia);
  }
  return false;
}

const isStatement = (node) =>
  (isElement(node, 'p') && hasClass(node, 'statement')) ||
  (node.type === 'raw' && /^\s*<p class="statement">/.test(node.value));

const isCredits = (node) => isElement(node, 'p') && /^In collaboration with/i.test(textOf(node).trim());

/** "#### The process" or "user journey mapping" sitting right before an H2. */
function isKicker(node, next) {
  if (!isElement(next, 'h2')) return false;
  if (isElement(node, 'h3', 'h4')) return true;
  if (!isElement(node, 'p') || isMedia(node)) return false;
  const text = textOf(node).trim();
  return text.length > 0 && text.length < 40 && !/[.!?:]$/.test(text);
}

function splitIntoBands(nodes) {
  const bands = [];
  let current = { nodes: [] };
  const close = () => {
    if (current.nodes.length) bands.push(current);
    current = { nodes: [] };
  };

  nodes.forEach((node, i) => {
    if (isStatement(node)) {
      close();
      bands.push({ statement: true, nodes: [node] });
      return;
    }
    if (isKicker(node, nodes[i + 1])) {
      close();
      // Kickers become plain labels so the heading outline stays in order.
      node.tagName = 'p';
      node.properties = { className: ['case-kicker'] };
      current.nodes.push(node);
      return;
    }
    if (isElement(node, 'h2')) {
      const onlyKicker = current.nodes.length === 1 && hasClass(current.nodes[0], 'case-kicker');
      if (!onlyKicker) close();
    }
    current.nodes.push(node);
  });
  close();
  return bands;
}

/** Collect runs of media into galleries, leaving everything else in place. */
function withGalleries(nodes) {
  const out = [];
  let run = [];
  const flush = () => {
    if (run.length > 1) {
      const gallery = el('div', 'case-gallery', run);
      gallery.properties.dataCount = String(Math.min(run.length, 4));
      out.push(gallery);
    } else out.push(...run);
    run = [];
  };
  for (const node of nodes) {
    if (isMedia(node)) run.push(node);
    else {
      flush();
      out.push(node);
    }
  }
  flush();
  return out;
}

/** Wrap "In collaboration with:" and the list after it. */
function withCredits(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    if (isCredits(nodes[i]) && isElement(nodes[i + 1], 'ul')) {
      out.push(el('div', 'case-credits', [nodes[i], nodes[i + 1]]));
      i++;
    } else out.push(nodes[i]);
  }
  return out;
}

function layoutBand(band) {
  const nodes = band.nodes;
  const h2 = nodes.find((node) => isElement(node, 'h2'));
  band.challenge = h2 && /challenge/i.test(textOf(h2));
  band.conclusion = nodes.some((node) => isElement(node, 'h3') && /^conclusion$/i.test(textOf(node).trim()));

  if (band.statement) return nodes;

  // Header: kicker, H2, and the plain paragraphs right after it. The intro
  // band (before the first H2) gets its opening paragraphs as a lead.
  let i = 0;
  const header = [];
  if (hasClass(nodes[0], 'case-kicker')) header.push(nodes[i++]);
  if (h2 && nodes[i] === h2) header.push(nodes[i++]);
  // (The challenge keeps its paragraphs for the side-by-side panels.)
  if ((header.length || !h2) && !band.challenge) {
    while (isElement(nodes[i], 'p') && !isMedia(nodes[i]) && !isCredits(nodes[i])) header.push(nodes[i++]);
  }
  const rest = nodes.slice(i);

  // Split the rest into loose content and heading-led groups.
  const loose = [];
  const groups = [];
  for (const node of rest) {
    if (isElement(node, 'h3', 'h4')) groups.push({ heading: node, items: [] });
    else if (groups.length) groups.at(-1).items.push(node);
    else loose.push(node);
  }

  const out = [];
  if (header.length) out.push(el('div', h2 ? 'case-header' : 'case-header case-header--intro', header));

  if (band.challenge) {
    // The challenge and each approach-style subsection, side by side.
    const cards = [el('div', 'case-panel', withCredits(loose.filter((n) => !isMedia(n))))];
    const media = loose.filter(isMedia);
    let g = 0;
    while (g < groups.length && groups[g].heading.tagName === 'h3') {
      const { heading, items } = groups[g++];
      cards.push(el('div', 'case-panel', [heading, ...items.filter((n) => !isMedia(n))]));
      media.push(...items.filter(isMedia));
    }
    if (cards[0].children.length === 0) cards.shift();
    out.push(el('div', 'case-panels case-panels--split', cards));
    out.push(...withGalleries(media));
    groups.splice(0, g);
  } else {
    out.push(...withCredits(withGalleries(loose)));
  }

  // Groups: features for one or two pieces of media, cards for runs of short
  // text-only subsections at the same level, plain blocks otherwise.
  let run = [];
  const flushRun = () => {
    if (run.length > 1) out.push(el('div', 'case-panels', run.map((g) => el('div', 'case-panel', [g.heading, ...g.items]))));
    else for (const g of run) out.push(el('div', 'case-block', [g.heading, ...withCredits(g.items)]));
    run = [];
  };
  let side = 0;
  for (const group of groups) {
    const media = group.items.filter(isMedia);
    const text = group.items.filter((n) => !isMedia(n));
    const textOnly = media.length === 0 && text.length > 0 && !text.some(isCredits);
    if (textOnly && (!run.length || run[0].heading.tagName === group.heading.tagName)) {
      run.push(group);
      continue;
    }
    flushRun();
    if (textOnly) {
      run.push(group);
    } else if (media.length > 0 && media.length <= 2) {
      const feature = el('div', ['case-feature', side++ % 2 ? 'case-feature--reverse' : ''].filter(Boolean), [
        el('div', 'case-feature__text', [group.heading, ...withCredits(text)]),
        el('div', 'case-feature__media', withGalleries(media)),
      ]);
      out.push(feature);
    } else {
      // Many images: text first, then a full-width gallery.
      out.push(el('div', 'case-block', [group.heading, ...withCredits(withGalleries(group.items))]));
    }
  }
  flushRun();
  return out;
}

const NEXT_TONE = { white: 'neutral', neutral: 'light', light: 'white', dark: 'neutral' };

/**
 * Markdown like `<div class="on-dark">`, an image, then `</div>` arrives as a
 * raw opening tag, the image, and a raw closing tag. Join them back into one
 * element so the box stays around its content when the bands are built.
 */
function joinRawWrappers(nodes) {
  const out = [];
  for (let i = 0; i < nodes.length; i++) {
    const open = nodes[i].type === 'raw' && nodes[i].value.trim().match(/^<div class="([^"]+)">$/);
    if (!open) {
      out.push(nodes[i]);
      continue;
    }
    const box = el('div', open[1].split(/\s+/));
    while (++i < nodes.length && !(nodes[i].type === 'raw' && nodes[i].value.trim() === '</div>')) {
      box.children.push(nodes[i]);
    }
    out.push(box);
  }
  return out;
}

/** Build the banded tree from the document's top-level nodes. */
function toBands(children) {
  const nodes = joinRawWrappers(children.filter((node) => !isBlank(node)));
  const bands = splitIntoBands(nodes);

  let previous = 'white';
  return bands.map((band, index) => {
    const content = layoutBand(band);
    let tone;
    if (index === 0 && !band.nodes.some((n) => isElement(n, 'h2'))) tone = 'white';
    else if (band.statement) tone = 'accent';
    else if (band.conclusion) tone = 'white';
    else if (previous === 'accent') tone = 'dark';
    else if (band.challenge) tone = 'light';
    else tone = NEXT_TONE[previous] ?? 'white';
    previous = tone;

    const section = el('section', ['case-band', band.statement ? 'case-band--statement' : ''].filter(Boolean), [
      el('div', 'case-band__inner', content),
    ]);
    section.properties.dataTone = tone;
    return section;
  });
}

/** Plugin factory: returns nothing (skips) for files outside case studies. */
export default function caseStudyBands({ fileURL }) {
  const path = fileURL ? decodeURIComponent(fileURL.pathname) : '';
  if (!path.includes('/content/case-studies/')) return null;
  return {
    name: 'case-study-bands',
    after(root, ctx) {
      // The tree handed to plugins is read-only, so work on a copy.
      const children = JSON.parse(JSON.stringify(root.children));
      ctx.replaceNode(root, { type: 'root', children: toBands(children) });
    },
  };
}
