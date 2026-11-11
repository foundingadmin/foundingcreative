import type { ImageMetadata } from 'astro';
import discoveryImage from '../assets/services/strategy-session-silhouettes.webp';
import strategyImage from '../assets/services/sticky-notes-glass-wall.webp';
import identityImage from '../assets/services/brand-strategy-laptop.webp';
import activationImage from '../assets/home/services/brand-3.webp';

// The BrandForge Gauntlet: the four steps from the Creative GTM for Startups
// deck. The BrandForge page shows them under its hero as cards that open one
// at a time (ProcessCards).

export interface BrandForgeStep {
  title: string;
  /** The step's one-line promise, from the deck. */
  tagline: string;
  /** The fuller explanation on the BrandForge page. */
  text: string;
  points: string[];
  image: { src: ImageMetadata; alt: string };
}

export const brandForgeSteps: BrandForgeStep[] = [
  {
    title: 'Discovery & Alignment',
    tagline: 'Stop guessing. Start knowing.',
    text: 'We pressure-test your assumptions first, so your brand is built on market reality, not founder intuition.',
    points: ['Stakeholder interviews', 'Market and competitor audit', 'Target audience personas'],
    image: { src: discoveryImage, alt: 'Three people silhouetted against a whiteboard of strategy sketches' },
  },
  {
    title: 'Strategy & Direction',
    tagline: 'Define the path. Design the win.',
    text: 'Four distinct creative strategies, not just options: different ways to win your market, with the voice and positioning for your first year defined.',
    points: ['Four distinct creative strategies', 'Voice and positioning', 'A decision gate before design'],
    image: { src: strategyImage, alt: 'Sticky notes from a strategy session on a glass wall' },
  },
  {
    title: 'Visual Identity',
    tagline: 'Building a face for the mission.',
    text: 'A scalable visual language, stress-tested on your highest-priority asset, like a homepage hero or a product label.',
    points: ['Identity exploration', 'Accessible color and typography', 'Tested on a real asset'],
    image: { src: identityImage, alt: 'Laptop showing a brand strategy framework and color wheel' },
  },
  {
    title: 'Activation',
    tagline: 'Launch the brand. Own the market.',
    text: 'The brand guide your team and your AI tools work from, plus the launch assets you need first, chosen with you.',
    points: ['The brand guide', 'Curated launch assets', 'A design appendix to grow into'],
    image: { src: activationImage, alt: 'Brand color palette swatches named Sky, Sea, Fern, Ash, Smoke, and Fog' },
  },
];
