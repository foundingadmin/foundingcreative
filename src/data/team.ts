import type { ImageMetadata } from 'astro';
import titus from '../assets/team/titus.webp';
import tyler from '../assets/team/tyler.webp';
import stacey from '../assets/team/stacey.webp';
import sasha from '../assets/team/sasha.webp';
import jamie from '../assets/team/jamie.webp';
import blake from '../assets/team/blake.webp';

// The Founding Creative team, in one place for the About page, the homepage,
// the footer, and the SiteLaunch pages. LinkedIn profiles come from the photo
// links on the live About page (its corner tabs all point to one profile by
// mistake).

export interface Person {
  name: string;
  /** First name, for small avatars. */
  short: string;
  role: string;
  photo: ImageMetadata;
  linkedin: string;
}

export const people = {
  titus: {
    name: 'Josh Titus',
    short: 'Titus',
    role: 'Brand & Marketing Design',
    photo: titus,
    linkedin: 'https://www.linkedin.com/in/tituscreative/',
  },
  tyler: {
    name: 'Tyler Lukey',
    short: 'Tyler',
    role: 'Systems & Product Design',
    photo: tyler,
    linkedin: 'https://www.linkedin.com/in/tylerlukey/',
  },
  stacey: {
    name: 'Stacey Cuzzacrea',
    short: 'Stacey',
    role: 'Creative Production Coordinator',
    photo: stacey,
    linkedin: 'https://www.linkedin.com/in/stacey-cuzzacrea-1ab16421b/',
  },
  sasha: {
    name: 'Sasha Beck',
    short: 'Sasha',
    role: 'Senior Designer',
    photo: sasha,
    linkedin: 'https://www.linkedin.com/in/sashambeck/',
  },
  jamie: {
    name: 'Jamie Caceres',
    short: 'Jamie',
    role: 'Marketing Director',
    photo: jamie,
    linkedin: 'https://www.linkedin.com/in/jamie-caceres-lukey/',
  },
  blake: {
    name: 'Blake Hickey',
    short: 'Blake',
    role: 'Account Executive',
    photo: blake,
    linkedin: 'https://www.linkedin.com/in/blakehickey/',
  },
} satisfies Record<string, Person>;

export type PersonKey = keyof typeof people;

/** The team in a given order (each page follows its live order). */
export const team = (order: PersonKey[] = ['titus', 'tyler', 'stacey', 'sasha', 'jamie', 'blake']): Person[] =>
  order.map((key) => people[key]);
