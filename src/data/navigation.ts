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
  { label: 'Services', href: '/services/', children: [...services, { label: 'All services', href: '/services/' }] },
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

export const legalLinks: NavLink[] = [
  { label: 'Imprint', href: '/imprint/' },
  { label: 'Cookie Policy', href: '/opt-out-preferences/' },
  { label: 'Disclaimer', href: '/disclaimer/' },
  { label: 'Privacy Statement', href: '/privacy-statement-us/' },
];

export const letsTalkHref = '/coffee/';
export const bookMeetingHref = 'https://bit.ly/chatwithfounding';
export const linkedInHref = 'https://www.linkedin.com/company/founding-creative/';

// Discovery-call booking page linked from the SiteLaunch package pages.
export const siteLaunchBookingHref =
  'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ05BDuPiNgyfpK6HRFzchDUrBoX2SjOj_dGFp47_xWtYoovrxOv1kLTSdDIoXCudPLii9WVIFpX';
