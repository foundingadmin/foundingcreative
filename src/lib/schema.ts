// schema.org structured data shared by every page. src/components/SEO.astro
// puts these nodes, plus the page's own (a Service, BlogPosting, FAQPage...),
// into one JSON-LD @graph, so each entity is described once per page and
// pages point at the Organization and WebSite by @id.
//
// Street addresses and a phone number are left out on purpose until we have
// them (Sprint 1.4).

import { team } from '../data/team';
import { linkedInHref } from '../data/navigation';

export type Node = Record<string, unknown>;

export interface Crumb {
  name: string;
  path: string;
}

export const organizationId = (site: URL) => `${site.href}#organization`;
export const websiteId = (site: URL) => `${site.href}#website`;

const founders = team(['tyler', 'titus']).map((person) => ({
  '@type': 'Person',
  name: person.name,
  jobTitle: person.role,
  sameAs: person.linkedin,
}));

/** The Organization. Home gets the full ProfessionalService description;
 * every other page carries the short form so its @id references resolve. */
export function organization(site: URL, logoUrl: string, description: string, full: boolean): Node {
  const base = {
    '@id': organizationId(site),
    name: 'Founding Creative',
    url: site.href,
    logo: { '@type': 'ImageObject', url: logoUrl },
    sameAs: [linkedInHref],
  };
  if (!full) return { '@type': 'Organization', ...base };
  return {
    '@type': ['Organization', 'ProfessionalService'],
    ...base,
    description,
    founder: founders,
    foundingDate: '2024-01',
    areaServed: { '@type': 'Country', name: 'United States' },
    address: [
      { '@type': 'PostalAddress', addressLocality: 'Denver', addressRegion: 'CO', addressCountry: 'US' },
      { '@type': 'PostalAddress', addressLocality: 'Chattanooga', addressRegion: 'TN', addressCountry: 'US' },
    ],
    knowsAbout: ['Brand strategy', 'Website design', 'Design systems', 'Event design', 'Animation'],
  };
}

export function website(site: URL): Node {
  return {
    '@type': 'WebSite',
    '@id': websiteId(site),
    name: 'Founding Creative',
    url: site.href,
    inLanguage: 'en-US',
    publisher: { '@id': organizationId(site) },
  };
}

/** Home > ...trail. The last crumb is the current page. */
export function breadcrumbs(site: URL, trail: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: new URL(crumb.path, site).href,
    })),
  };
}

/** A Service offered by the Organization (service and SiteLaunch pages). */
export function service(site: URL, fields: { name: string; description: string; path: string } & Node): Node {
  const { path, ...rest } = fields;
  return {
    '@type': 'Service',
    url: new URL(path, site).href,
    provider: { '@id': organizationId(site) },
    areaServed: { '@type': 'Country', name: 'United States' },
    ...rest,
  };
}
