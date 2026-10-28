// Site-wide motion, modeled on the live WordPress site:
// - Scroll reveal: elements fade up the first time they scroll into view.
//   The hidden starting state is in global.css; this only adds .is-revealed.
// - Stagger: children of [data-reveal-stagger] reveal one after another.
// - Header: gets [data-scrolled] once the page scrolls, for its solid backdrop.
// - Background videos pause for visitors who prefer reduced motion.

const REVEAL = '[data-reveal], [data-reveal-stagger] > *, .section__intro, .case-band__inner > *';
const STAGGER_STEP = 120; // ms between siblings

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function setupReveal() {
  const targets = document.querySelectorAll<HTMLElement>(REVEAL);

  for (const parent of document.querySelectorAll<HTMLElement>('[data-reveal-stagger]')) {
    [...parent.children].forEach((child, i) => {
      (child as HTMLElement).style.setProperty('--reveal-delay', `${i * STAGGER_STEP}ms`);
    });
  }

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // Fire once, a little before the element is fully on screen (the live site
  // uses 10 to 35 percent offsets).
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  targets.forEach((el) => observer.observe(el));
}

function setupHeader() {
  const header = document.querySelector<HTMLElement>('.site-header');
  if (!header) return;
  const update = () => header.toggleAttribute('data-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function setupVideos() {
  const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-ambient]')];
  if (!videos.length) return;
  const visible = new Set<HTMLVideoElement>();
  // Only play while on screen, and never for reduced-motion visitors.
  const apply = () => {
    for (const video of videos) {
      if (!reduceMotion.matches && visible.has(video)) video.play().catch(() => {});
      else video.pause();
    }
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const video = entry.target as HTMLVideoElement;
      if (entry.isIntersecting) visible.add(video);
      else visible.delete(video);
    }
    apply();
  });
  videos.forEach((video) => observer.observe(video));
  reduceMotion.addEventListener('change', apply);
}

setupReveal();
setupHeader();
setupVideos();
