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

// Small line icons for the challenge cards (Lucide circle-x and check).
const svgIcon = (paths) => ({
  type: 'element',
  tagName: 'svg',
  properties: {
    viewBox: '0 0 24 24',
    width: '28',
    height: '28',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ariaHidden: 'true',
  },
  children: paths.map(([tagName, properties]) => ({ type: 'element', tagName, properties, children: [] })),
});
const ICON_PROBLEM = () => svgIcon([['circle', { cx: '12', cy: '12', r: '10' }], ['path', { d: 'm15 9-6 6' }], ['path', { d: 'm9 9 6 6' }]]);
const ICON_WIN = () => svgIcon([['path', { d: 'M20 6 9 17l-5-5' }]]);

/**
 * One challenge row, as on the live pages: a label column (heading and
 * paragraph) beside a card per list item, pink with an x for problems and
 * green with a check for the approach.
 */
function challengeRow(label, list, kind) {
  const items = (list?.children ?? []).filter((li) => isElement(li, 'li'));
  const cards = items.map((li) =>
    el('li', ['case-point', `case-point--${kind}`], [
      el('span', 'case-point__icon', [kind === 'problem' ? ICON_PROBLEM() : ICON_WIN()]),
      el('p', null, li.children.filter((child) => !isBlank(child))),
    ]),
  );
  const row = el('div', 'case-challenge__row', [el('div', 'case-challenge__label', label)]);
  if (cards.length) row.children.push(el('ul', 'case-challenge__cards', cards));
  return row;
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
  // (The challenge keeps its paragraphs for its label column.)
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
  const media = [];

  if (band.challenge) {
    // Problems, then the approach, each as a row of cards.
    const rows = [];
    const list = loose.find((n) => isElement(n, 'ul'));
    rows.push(challengeRow([...header, ...loose.filter((n) => isElement(n, 'p') && !isMedia(n))], list, 'problem'));
    media.push(...loose.filter(isMedia));
    if (groups[0]?.heading.tagName === 'h3') {
      const { heading, items } = groups.shift();
      const approachList = items.find((n) => isElement(n, 'ul'));
      rows.push(challengeRow([heading, ...items.filter((n) => isElement(n, 'p') && !isMedia(n))], approachList, 'win'));
      media.push(...items.filter(isMedia));
    }
    out.push(el('div', 'case-challenge', rows));
  } else if (band.conclusion) {
    // The closing image card, the closing line, then Conclusion beside Key
    // outcomes, with partner credits underneath.
    out.push(el('div', 'case-closing'));
    if (header.length) out.push(el('div', 'case-header case-header--center', header));
    const columns = [];
    const credits = [];
    for (const group of groups) {
      if (group.heading.tagName === 'h3') columns.push([group.heading]);
      else columns.at(-1)?.push(group.heading);
      for (const item of withCredits(group.items)) {
        if (hasClass(item, 'case-credits')) credits.push(item);
        else (columns.at(-1) ?? columns[columns.push([]) - 1]).push(item);
      }
    }
    out.push(el('div', 'case-conclusion', columns.map((col) => el('div', 'case-conclusion__col', col))));
    // Several studies repeat the same credit; show each once.
    const seen = new Set();
    for (const credit of credits) {
      const key = textOf(credit);
      if (!seen.has(key)) out.push(credit);
      seen.add(key);
    }
    return out;
  }

  if (header.length && !band.challenge) {
    const centered = hasClass(header[0], 'case-kicker');
    out.push(el('div', h2 ? ['case-header', centered ? 'case-header--center' : ''].filter(Boolean) : 'case-header case-header--intro', header));
  }
  if (!band.challenge) out.push(...withCredits(withGalleries(loose)));

  // Groups. Runs of short text-only subsections become columns; subsections
  // with one or two images become image cards, two to a row (or a
  // side-by-side feature when there's only one); many images get a gallery.
  let textRun = [];
  let cardRun = [];
  const flushText = () => {
    if (textRun.length > 1) out.push(el('div', 'case-columns', textRun.map((g) => el('div', 'case-column', [g.heading, ...g.items]))));
    else for (const g of textRun) out.push(el('div', 'case-block', [g.heading, ...withCredits(g.items)]));
    textRun = [];
  };
  const flushCards = () => {
    if (cardRun.length > 1) {
      out.push(
        el(
          'div',
          'case-cards',
          cardRun.map((g) =>
            el('div', 'case-card', [el('div', 'case-card__media', withGalleries(g.media)), g.heading, ...withCredits(g.text)]),
          ),
        ),
      );
    } else {
      for (const g of cardRun) {
        out.push(
          el('div', ['case-feature', out.filter((n) => hasClass(n, 'case-feature')).length % 2 ? 'case-feature--reverse' : ''].filter(Boolean), [
            el('div', 'case-feature__text', [g.heading, ...withCredits(g.text)]),
            el('div', 'case-feature__media', withGalleries(g.media)),
          ]),
        );
      }
    }
    cardRun = [];
  };

  // Leftover challenge media and the subsections after it (Hypothesis,
  // Approach) share one feature: text stacked beside the image.
  if (band.challenge) {
    const text = groups.flatMap((g) => [g.heading, ...g.items.filter((n) => !isMedia(n))]);
    media.push(...groups.flatMap((g) => g.items.filter(isMedia)));
    if (text.length && media.length) {
      out.push(el('div', 'case-feature', [el('div', 'case-feature__text', text), el('div', 'case-feature__media', withGalleries(media))]));
    } else if (text.length || media.length) out.push(...text, ...withGalleries(media));
    return out;
  }

  for (const group of groups) {
    const groupMedia = group.items.filter(isMedia);
    const text = group.items.filter((n) => !isMedia(n));
    const textOnly = groupMedia.length === 0 && text.length > 0 && !text.some(isCredits);
    if (textOnly) {
      flushCards();
      if (textRun.length && textRun[0].heading.tagName !== group.heading.tagName) flushText();
      textRun.push(group);
    } else if (groupMedia.length > 0 && groupMedia.length <= 2) {
      flushText();
      cardRun.push({ heading: group.heading, text, media: groupMedia });
    } else {
      flushText();
      flushCards();
      // Many images (or a heading on its own): text first, then a gallery.
      out.push(el('div', 'case-block', [group.heading, ...withCredits(withGalleries(group.items))]));
    }
  }
  flushText();
  flushCards();
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

    const section = el(
      'section',
      ['case-band', band.statement ? 'case-band--statement' : '', band.conclusion ? 'case-band--conclusion' : ''].filter(Boolean),
      [
        el('div', 'case-band__inner', content),
      ],
    );
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
