// Site navigation, shared by the header, mobile menu, and footer.
// Labels and URLs match the live WordPress menus.

export interface NavLink {
  label: string;
  href: string;
}

export interface NavItem extends NavLink {
  children?: NavLink[];
}

export const services: NavLink[] = [
  { label: 'Branding and Strategy', href: '/brandforge/' },
  { label: 'Design Services', href: '/services/design-services/' },
  { label: 'Website Services', href: '/services/website-services/' },
  { label: 'Event Services', href: '/services/event-services/' },
  { label: 'Animation Services', href: '/services/animation-services/' },
  { label: 'Custom', href: '/services/custom/' },
];

export const sitelaunch: NavLink[] = [
  { label: 'Rocket SiteLaunch', href: '/rocket-sitelaunch/' },
  { label: 'Prism SiteLaunch', href: '/prism-sitelaunch/' },
  { label: 'Orbit SiteLaunch', href: '/orbit-sitelaunch/' },
];

export const mainNav: NavItem[] = [
  { label: 'Case Studies', href: '/case-studies/' },
  { label: 'Services', href: '/services/', children: services },
  { label: 'About', href: '/about-us/' },
  { label: 'Fractional Creative', href: '/fractional-creative/' },
  { label: 'Contact Us', href: '/contact-us/' },
  { label: 'Blog', href: '/blog/' },
];

export const companyLinks: NavLink[] = [
  { label: 'About Us', href: '/about-us/' },
  { label: 'Case Studies', href: '/case-studies/' },
  { label: 'Fractional Creative', href: '/fractional-creative/' },
  { label: 'Contact Us', href: '/contact-us/' },
  { label: 'Blog', href: '/blog/' },
];

// Hand-copied from the live footer until the case study and blog content
// collections exist; then these become "latest N" queries.
export const latestWork: NavLink[] = [
  { label: 'Turntide Website', href: '/case-study/turntide-website/' },
  { label: 'Aprilaire Product App', href: '/case-study/aprilaire-product-app/' },
  { label: 'Bell Bird ATM', href: '/case-study/bell-bird-atm/' },
  { label: 'Plant Nursery eCommerce', href: '/case-study/plant-nursery-ecommerce/' },
  { label: 'Innovation Forum Event', href: '/case-study/innovation-forum-event/' },
];

export const latestPosts: NavLink[] = [
  {
    label: 'Marketing Agency, Creative Design Studio, or Something Else?',
    href: '/marketing-agency-creative-design-studio-or-something-else/',
  },
  {
    label: 'The Missing Middle Ground: Why Your AI Needs a Human-Driven Creative Foundation',
    href: '/the-missing-middle-ground-why-your-ai-needs-a-human-driven-creative-foundation/',
  },
  { label: '5 Website Truths for Marketers', href: '/5-website-truths-for-marketers/' },
];

export const legalLinks: NavLink[] = [
  { label: 'Imprint', href: '/imprint/' },
  { label: 'Cookie Policy', href: '/opt-out-preferences/' },
  { label: 'Disclaimer', href: '/disclaimer/' },
  { label: 'Privacy Statement', href: '/privacy-statement-us/' },
];

export const letsTalkHref = '/coffee/';
export const bookMeetingHref = 'https://bit.ly/chatwithfounding';
export const linkedInHref = 'https://www.linkedin.com/company/founding-creative/';
