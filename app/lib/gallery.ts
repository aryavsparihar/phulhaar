/**
 * Facts about the gallery that the pages share, kept in one place so they are changed once.
 *
 * Anything set to `null` is not known yet and the pages say so plainly rather than inventing it.
 * Fill these in before launch.
 */
export const GALLERY = {
  name: 'Phulhaar Gallery',
  byline: 'by PAT and J.K. Co.',
  openingDate: '2026-11-08',
  openingLabel: '8 November 2026',
  /** The street address, one line per entry. `null` until confirmed. */
  address: null as string[] | null,
  /** Opening hours, one line per entry. `null` until confirmed. */
  hours: null as string[] | null,
  /** Where artists apply to join, on PJK. */
  pjkOnboardingUrl: 'https://pjk.co.in/collaborate/artists',
  pjkUrl: 'https://pjk.co.in',
} as const;

/** The navigation, the same on every page and on every screen size. */
export const NAV = [
  {to: '/collections/all', label: 'Artworks'},
  {to: '/artists', label: 'Artists'},
  {to: '/traditions', label: 'Traditions'},
  {to: '/visit', label: 'Visit'},
  {to: '/for-artists', label: 'For artists'},
] as const;

/**
 * The named traditions the gallery exists to show properly. Each links to the catalogue filtered
 * by a search for its name, which matches the work's title, tags and type in Shopify.
 */
export const TRADITIONS = [
  {name: 'Madhubani', region: 'Bihar'},
  {name: 'Pichwai', region: 'Rajasthan'},
  {name: 'Gond', region: 'Madhya Pradesh'},
  {name: 'Warli', region: 'Maharashtra'},
  {name: 'Pattachitra', region: 'Odisha and Bengal'},
  {name: 'Kalamkari', region: 'Andhra Pradesh'},
  {name: 'Tanjore', region: 'Tamil Nadu'},
  {name: 'Phad', region: 'Rajasthan'},
] as const;

/** Broad categories for the catalogue's quick filters. */
export const CATEGORIES = [
  'Painting',
  'Drawing',
  'Sculpture',
  'Textile',
  'Print',
  'Photography',
] as const;

export function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'P';
}
