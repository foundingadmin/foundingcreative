// Site navigation, shared by the header, mobile menu, and footer.
// Labels and URLs match the live WordPress menus, except where the Q4 2026
// review changed them (Branding and Strategy, no SiteLaunch).

export interface NavLink {
  label: string;
  href: string;
}

export interface NavItem extends NavLink {
  children?: NavLink[];
}

export const services: NavLink[] = [
  { label: 'Branding and Strategy', href: '/services/branding-services/' },
  { label: 'Design Services', href: '/services/design-services/' },
  { label: 'Website Services', href: '/services/website-services/' },
  { label: 'Event Services', href: '/services/event-services/' },
  { label: 'Animation Services', href: '/services/animation-services/' },
  { label: 'Custom', href: '/services/custom/' },
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
  { label: 'Contact Us', href: '/contact-us/' },
  { label: 'Blog', href: '/blog/' },
];

// The footer's "What we do" column: the services, then the retainer offer.
export const footerServices: NavLink[] = [...services, { label: 'Fractional Creative', href: '/fractional-creative/' }];

export const legalLinks: NavLink[] = [
  { label: 'Imprint', href: '/imprint/' },
  { label: 'Cookie Policy', href: '/opt-out-preferences/' },
  { label: 'Disclaimer', href: '/disclaimer/' },
  { label: 'Privacy Statement', href: '/privacy-statement-us/' },
];

export const letsTalkHref = '/coffee/';
// The scheduling page /coffee/ redirects to (keep in sync with vercel.json).
export const bookMeetingHref =
  'https://calendar.google.com/calendar/appointments/schedules/AcZssZ1I3oI4KqMnFfcTTL5qkzXIuY06h4DeAE4B10vNbRNinT71if9o6Tj8-BXP-0kzp8vnu2KKz7yb';
export const linkedInHref = 'https://www.linkedin.com/company/founding-creative/';
