// The custom cursor from the live SiteLaunch pages, site-wide: a dot that
// follows the pointer, a ring that eases after it (and grows over links and
// buttons), and a holographic ripple on click. Styles are in global.css.
// Only for a fine pointer (mouse, trackpad) and never with reduced motion.

const fine = window.matchMedia('(pointer: fine)').matches;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (fine && !reduceMotion) {
  document.documentElement.classList.add('has-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot is-hidden';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring is-hidden';
  for (const el of [dot, ring]) el.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);

  let x = 0;
  let y = 0;
  let ringX = 0;
  let ringY = 0;
  let hovering = false;
  let frame = 0;

  const scale = () => (hovering ? 1.5 : 1);

  // The ring eases toward the pointer and stops animating once it arrives.
  const follow = () => {
    ringX += (x - ringX) * 0.1;
    ringY += (y - ringY) * 0.1;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${scale()})`;
    frame = Math.abs(x - ringX) + Math.abs(y - ringY) > 0.5 ? requestAnimationFrame(follow) : 0;
  };

  document.addEventListener('mousemove', (event) => {
    x = event.clientX;
    y = event.clientY;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale()})`;
    dot.classList.remove('is-hidden');
    ring.classList.remove('is-hidden');
    if (!frame) frame = requestAnimationFrame(follow);
  });

  // Hide while the pointer is outside the window.
  document.documentElement.addEventListener('mouseleave', () => {
    dot.classList.add('is-hidden');
    ring.classList.add('is-hidden');
  });

  // Grow over anything clickable.
  const interactive = 'a, button, summary, label, [role="button"], .hover-zone';
  document.addEventListener('mouseover', (event) => {
    hovering = !!(event.target as Element | null)?.closest(interactive);
  });

  document.addEventListener('click', (event) => {
    if (!event.isTrusted || event.detail === 0) return; // keyboard "clicks" have no position
    const ripple = document.createElement('div');
    ripple.className = 'cursor-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    ripple.addEventListener('animationend', () => ripple.remove());
    document.body.append(ripple);
  });
}
