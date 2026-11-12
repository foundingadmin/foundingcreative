# SiteLaunch (archived November 2026)

The Rocket, Prism and Orbit SiteLaunch packages were sunset in the Q4 2026
website review. Their pages, content, components and images are kept here in
case the packages come back. Nothing in this folder is built or deployed.

The three URLs now redirect to `/services/website-services/` (see `vercel.json`).

## What is here

Everything sits at the path it had in the repo, under this folder:

- `src/pages/{rocket,prism,orbit}-sitelaunch/`: the three package pages
- `src/content/sitelaunch/*.yaml`: each package's copy
- `src/components/SiteLaunchPage.astro`: the package page template
- `src/components/SiteLaunchSection.astro`: the "Not every brand needs the same website" band
- `src/components/SiteLaunchPackages.astro`: the three package cards
- `src/data/sitelaunch-art.ts`, `src/assets/sitelaunch/`, `src/assets/home/sitelaunch/`: artwork and photos
- `public/media/home/light-speed.mp4`: the band's background video

Still in the live code, unused: the `sitelaunch` variant of
`src/components/ContactForm.astro` (the package inquiry form) and the
`.theme-prism`, `.theme-rocket` and `.theme-orbit` colors in `src/styles/global.css`.

## To bring it back

1. Move each file above back to the same path outside `archive/sitelaunch/`.
2. Put the collection back in `src/content.config.ts` and add `sitelaunch` to `collections`:

```ts
// SiteLaunch website packages (Prism, Rocket, Orbit), one YAML file each,
// rendered by src/components/SiteLaunchPage.astro.
const sitelaunch = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/sitelaunch' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      ...seo,
      order: z.number(),
      heroImage: image(),
      shareImage: image(),
      shareImageAlt: z.string().min(1),
      // Icon names are from src/components/Icon.astro (the build fails on an unknown one).
      pillars: z.array(z.object({ label: z.string(), icon: z.string() })).length(3),
      title: z.string(),
      subtitle: z.string(),
      audience: z.object({ heading: z.string(), lead: z.string(), points: z.array(z.string()).min(1) }),
      stats: z.array(z.object({ value: z.string(), label: z.string(), source: z.string().url().optional() })),
      why: z.object({ heading: z.string(), lead: z.string(), text: z.string() }),
      features: z.object({
        heading: z.string(),
        text: z.string(),
        lead: z.string(),
        items: z.array(z.object({ title: z.string(), text: z.string(), icon: z.string() })).length(6),
      }),
      process: z.object({
        heading: z.string(),
        text: z.string(),
        lead: z.string(),
        steps: z.array(z.object({ phase: z.string(), title: z.string(), text: z.string() })).length(4),
      }),
      closing: z.object({ heading: z.string(), text: z.string(), tagline: z.string() }),
      ctaHeading: z.string(),
    }),
});
```

3. Put the links back in `src/data/navigation.ts`:

```ts
export const sitelaunch: NavLink[] = [
  { label: 'Rocket SiteLaunch', href: '/rocket-sitelaunch/' },
  { label: 'Prism SiteLaunch', href: '/prism-sitelaunch/' },
  { label: 'Orbit SiteLaunch', href: '/orbit-sitelaunch/' },
];

// Discovery-call booking page linked from the SiteLaunch package pages.
export const siteLaunchBookingHref =
  'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ05BDuPiNgyfpK6HRFzchDUrBoX2SjOj_dGFp47_xWtYoovrxOv1kLTSdDIoXCudPLii9WVIFpX';
```

4. Add the links back to the header menu and footer, and `<SiteLaunchSection />` wherever the band should show.
5. Remove the three SiteLaunch redirects from `vercel.json`, and add `[a-z]+-sitelaunch` back to `MAIN` in `astro.config.mjs` for sitemap priority.
6. The tests that covered these pages are in git history before this change (`tests/motion.spec.ts`, `tests/contact-form.spec.ts`, `tests/seo.spec.ts`).
