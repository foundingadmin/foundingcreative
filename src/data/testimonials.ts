// Client testimonials from the WordPress testimonial posts (exports/
// Testimonials.csv). Those posts' URLs redirect to the About page, which
// shows these. Quotes are verbatim.

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
}

export const testimonials: Testimonial[] = [
  {
    quote:
      "Working with Josh and Tyler is always a pleasure and what a treat to have them both under one roof! Founding Creative helped us launch our company's rebrand/website/misc marketing materials for the last 5 years now. Not only are they always on time with their work, it's above and beyond what we had asked for. The creative process is always collaborative and insightful. We can't say enough about this team and what they bring to the table time and time again!!!",
    name: 'Jon Ciotti',
    role: 'Co-Founder',
    company: 'The Nomadic Circle',
  },
  {
    quote:
      'Founding Creative has been an invaluable resource for my business since its inception. They expertly guided us through establishing our brand identity, developing a professional website, and creating effective marketing collateral. Their team has consistently delivered high-quality results and remains a trusted partner for all our creative needs. I highly recommend their services to any business seeking a dedicated and skilled creative partner.',
    name: 'John Keen',
    role: 'Partner, SVP of Business Development',
    company: 'Metanoia',
  },
  {
    quote:
      'Trust the process! Working with Founding showed us what we had been missing in previous rebrands. The journey from brand identity through asset and website creation was consistent and fluid. The end result was better than we imagined. The team was professional, responsive, and continue to support us with a maintenance plan. They will be my number one referral for anyone in need of those services.',
    name: 'DeAnna Miller',
    role: 'Managing Director, Experiential Marketing',
    company: '82 South',
  },
  {
    quote:
      'Working with Founding is a joy! My team has worked with them on numerous projects in the past year, from Event Branding to Website Designs and Asset Portals. Collaborating with Founding makes any project more creative when they take our ideas to the next level. I appreciate their organization, communication, and transparency throughout the whole workflow. Josh is very personable and always brings great energy to our calls. Founding is an all around dependable and enjoyable agency to work with!',
    name: 'Paige Isovitsch',
    role: 'Creative Services Specialist',
    company: 'Moss & Associates',
  },
  {
    quote:
      "Josh and Tyler carefully considered every detail and input about my business, translating it into a cohesive, high-quality design and layout. Their expertise and creativity brought our vision to life, resulting in a stunning website. I couldn't be happier with the outcome and highly recommend their work!",
    name: 'Brooke McPoyle',
    role: 'Owner',
    company: 'Musical Breathwork',
  },
];
