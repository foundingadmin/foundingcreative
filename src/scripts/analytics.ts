// GA4, behind cookie consent. Google Consent Mode v2 starts with everything
// denied (set inline in Analytics.astro before anything else runs), and
// gtag.js is not even downloaded until the visitor accepts analytics cookies.
// GA4 only runs on foundingcreative.com in a production build: previews,
// vercel.app and local builds never send anything.
//
// Events (mark generate_lead and book_meeting as key events in GA4 Admin,
// see CLAUDE.md):
//   generate_lead  the contact form's Formspree response came back OK
//   book_meeting   a click on any link to the meeting scheduler
//   email_click    a click on a mailto: link
//   phone_click    a click on a tel: link
//   cta_click      a click on a primary CTA button, with cta_location

type Choice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

const STORAGE_KEY = 'fc-consent';
const PRODUCTION_HOST = 'foundingcreative.com';
const measurementId = document.documentElement.dataset.gaId;
const enabled = Boolean(measurementId) && location.hostname === PRODUCTION_HOST;

function readChoice(): Choice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'granted' || value === 'denied' ? value : null;
  } catch {
    return null;
  }
}

function saveChoice(choice: Choice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
}

let granted = false;
let scriptAdded = false;
function grant() {
  if (!enabled) return;
  granted = true;
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  if (scriptAdded) return;
  scriptAdded = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.append(script);
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
}

function revoke() {
  if (!granted) return;
  granted = false;
  window.gtag('consent', 'update', { analytics_storage: 'denied' });
}

/** Sends a GA4 event, only while the visitor has accepted analytics. */
function track(name: string, params: Record<string, string> = {}) {
  if (granted) window.gtag('event', name, params);
}

// Consent banner and the footer's "Cookie settings" button
const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
function decide(choice: Choice) {
  saveChoice(choice);
  if (banner) banner.hidden = true;
  if (choice === 'granted') grant();
  else revoke();
}

banner?.querySelector('[data-consent-accept]')?.addEventListener('click', () => decide('granted'));
banner?.querySelector('[data-consent-decline]')?.addEventListener('click', () => decide('denied'));
for (const button of document.querySelectorAll('[data-consent-open]')) {
  button.addEventListener('click', () => {
    if (!banner) return;
    banner.hidden = false;
    banner.querySelector<HTMLElement>('[data-consent-accept]')?.focus();
  });
}

const choice = readChoice();
if (choice === 'granted') grant();
else if (choice === null && banner) banner.hidden = false;

// Events
document.addEventListener('contact:success', () => track('generate_lead', { form: 'contact' }));

// Primary CTAs: the holographic buttons and the header's "Let's talk".
const PRIMARY_CTA = '.button--primary, .site-header__cta, .mobile-menu__cta';
const scheduler = /^https:\/\/calendar\.google\.com\/calendar\/(u\/\d+\/)?appointments\/|^\/coffee\/?$/;

/** Where a CTA sits: an explicit data-cta-location, else the header, the
 * footer, or the section it is in (its id, label, or first class). */
function ctaLocation(link: HTMLElement): string {
  const explicit = link.closest<HTMLElement>('[data-cta-location]')?.dataset.ctaLocation;
  if (explicit) return explicit;
  if (link.closest('.site-header, #mobile-menu')) return 'header';
  if (link.closest('footer')) return 'footer';
  const section = link.closest<HTMLElement>('section');
  return section?.id || section?.getAttribute('aria-labelledby') || section?.classList[0] || 'main';
}

document.addEventListener('click', (event) => {
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
  if (!link) return;
  const href = link.getAttribute('href') ?? '';
  const text = link.textContent?.trim().replace(/\s+/g, ' ') ?? '';

  if (scheduler.test(href)) track('book_meeting', { link_text: text, link_url: link.href });
  if (href.startsWith('mailto:')) track('email_click', { link_url: href });
  if (href.startsWith('tel:')) track('phone_click', { link_url: href });
  if (link.matches(PRIMARY_CTA)) {
    track('cta_click', { cta_location: ctaLocation(link), link_text: text, link_url: link.href });
  }
});
