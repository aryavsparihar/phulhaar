/**
 * Facts about the gallery that the pages share, kept in one place so they are changed once.
 *
 * The address, hours and announcement are not here: staff set them in /admin/settings.
 */
export const GALLERY = {
  name: 'Phulhaar Gallery',
  byline: 'by PAT and J.K. Co.',
  /** Where artists apply to join, on PJK. */
  pjkOnboardingUrl: 'https://pjk.co.in/collaborate/artists',
  pjkUrl: 'https://pjk.co.in',
} as const;

/** The navigation, the same on every page and on every screen size. */
export const NAV = [
  {to: '/collections/all', label: 'Artworks'},
  {to: '/artists', label: 'Artists'},
  {to: '/visit', label: 'Visit'},
  {to: '/for-artists', label: 'For artists'},
] as const;

export function initialOf(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'P';
}
