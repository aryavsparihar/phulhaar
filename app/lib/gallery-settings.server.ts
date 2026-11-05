import type {Storefront} from '@shopify/hydrogen';

/** The gallery's details as staff set them in /admin/settings. Empty fields are simply absent. */
export interface GallerySettings {
  address: string[];
  hours: string[];
  mapUrl: string | null;
  phone: string | null;
  announcement: string | null;
}

const SETTINGS_QUERY = `#graphql
  query GallerySettings($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobject(handle: {type: "phulhaar_gallery", handle: "settings"}) {
      address: field(key: "address") { value }
      hours: field(key: "hours") { value }
      mapUrl: field(key: "map_url") { value }
      phone: field(key: "phone") { value }
      announcement: field(key: "announcement") { value }
    }
  }
` as const;

const lines = (value?: string | null) =>
  (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export async function gallerySettings(
  storefront: Storefront,
): Promise<GallerySettings> {
  const metaobject = await storefront
    .query(SETTINGS_QUERY, {cache: storefront.CacheShort()})
    .then((data) => data.metaobject)
    .catch(() => null);
  return {
    address: lines(metaobject?.address?.value),
    hours: lines(metaobject?.hours?.value),
    mapUrl: metaobject?.mapUrl?.value || null,
    phone: metaobject?.phone?.value || null,
    announcement: metaobject?.announcement?.value?.trim() || null,
  };
}
