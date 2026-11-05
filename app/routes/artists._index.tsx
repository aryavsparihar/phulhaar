import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/artists._index';
import {initialOf} from '~/lib/gallery';

export const meta: Route.MetaFunction = () => [
  {title: 'Artists — Phulhaar Gallery'},
];

export async function loader({context}: Route.LoaderArgs) {
  // Artists are `phulhaar_artist` metaobjects, created from PJK's profile (see docs/DATA-MODEL.md).
  // A store without the schema yet answers with nothing rather than an error.
  const artists = await context.storefront
    .query(ARTISTS_QUERY, {cache: context.storefront.CacheShort()})
    .then(({metaobjects}) => metaobjects.nodes)
    .catch(() => []);

  const sorted = artists
    .map((artist) => ({
      handle: artist.handle,
      name: artist.displayName?.value ?? artist.handle,
      city: artist.city?.value ?? null,
      state:
        artist.state?.reference && 'field' in artist.state.reference
          ? (artist.state.reference.field?.value ?? null)
          : null,
      portrait:
        artist.portrait?.reference && 'image' in artist.portrait.reference
          ? artist.portrait.reference.image
          : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-IN'));

  return {artists: sorted};
}

export default function Artists() {
  const {artists} = useLoaderData<typeof loader>();

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">The artists</p>
        <h1>Artists of the gallery</h1>
        <p className="lede">
          Every artist here has been approved by PAT and J.K. Co. and manages
          their own work in the Phulhaar studio.
        </p>
      </header>
      <hr className="gold-rule" style={{marginBottom: '2rem'}} />

      {artists.length === 0 ? (
        <div className="empty">
          <h3>The first artists are being introduced</h3>
          <p className="muted">
            Their profiles will appear here as their work is hung.
          </p>
          <Link className="link-arrow" to="/for-artists">
            Are you an artist?
          </Link>
        </div>
      ) : (
        <div className="artist-list">
          {artists.map((artist) => (
            <Link
              key={artist.handle}
              className="artist-card"
              to={`/artists/${artist.handle}`}
              prefetch="intent"
            >
              {artist.portrait ? (
                <Image
                  className="avatar"
                  data={artist.portrait}
                  alt=""
                  width={64}
                  height={64}
                  crop="center"
                />
              ) : (
                <span className="avatar" aria-hidden="true">
                  {initialOf(artist.name)}
                </span>
              )}
              <span>
                <strong>{artist.name}</strong>
                <span className="muted">
                  {[artist.city, artist.state].filter(Boolean).join(', ')}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
      <div style={{height: '5rem'}} />
    </div>
  );
}

const ARTISTS_QUERY = `#graphql
  query Artists($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobjects(type: "phulhaar_artist", first: 250) {
      nodes {
        handle
        displayName: field(key: "display_name") { value }
        city: field(key: "city") { value }
        state: field(key: "state") {
          reference { ... on Metaobject { field(key: "name") { value } } }
        }
        portrait: field(key: "portrait") {
          reference {
            ... on MediaImage { image { url altText width height } }
          }
        }
      }
    }
  }
` as const;
