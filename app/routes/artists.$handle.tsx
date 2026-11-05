import {Link, useLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/artists.$handle';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {
  ARTWORK_CARD_FRAGMENT,
  belongsTo,
  type ArtworkCardData,
} from '~/lib/catalogue';
import {initialOf} from '~/lib/gallery';

export const meta: Route.MetaFunction = ({data}) => [
  {
    title: data
      ? `${data.artist.name} — Phulhaar Gallery`
      : 'Artist — Phulhaar Gallery',
  },
  ...(data?.artist.biography
    ? [{name: 'description', content: data.artist.biography.slice(0, 160)}]
    : []),
];

export async function loader({context, params}: Route.LoaderArgs) {
  const handle = params.handle ?? '';
  const {metaobject} = await context.storefront
    .query(ARTIST_QUERY, {
      variables: {handle: {type: 'phulhaar_artist', handle}},
    })
    .catch(() => ({metaobject: null}));

  if (!metaobject) throw new Response(null, {status: 404});

  const name = metaobject.displayName?.value ?? handle;

  // Works are linked to the artist by the `phulhaar.artist` metafield; Shopify's product search
  // cannot filter on a metaobject reference, so match on vendor (set to the artist's name when a
  // work is loaded) and then keep only the works that really point at this artist.
  const {products} = await context.storefront.query(ARTIST_WORKS_QUERY, {
    variables: {query: `vendor:"${name.replace(/"/g, '')}"`},
  });
  const artistId = metaobject.artistId?.value ?? null;
  const works = (products.nodes as ArtworkCardData[]).filter((work) => {
    const reference = work.artist?.reference;
    if (reference && 'handle' in reference && reference.handle) {
      return reference.handle === handle;
    }
    return belongsTo(work, {artistId, name});
  });

  return {
    artist: {
      handle,
      name,
      biography: metaobject.biography?.value ?? null,
      statement: metaobject.statement?.value ?? null,
      city: metaobject.city?.value ?? null,
      state:
        metaobject.state?.reference && 'field' in metaobject.state.reference
          ? (metaobject.state.reference.field?.value ?? null)
          : null,
      verified: metaobject.verified?.value === 'true',
      portrait:
        metaobject.portrait?.reference &&
        'image' in metaobject.portrait.reference
          ? metaobject.portrait.reference.image
          : null,
    },
    works,
  };
}

export default function Artist() {
  const {artist, works} = useLoaderData<typeof loader>();

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/artists">Artists</Link>
      </nav>
      <header className="page-head artist-head">
        {artist.portrait ? (
          <Image
            className="avatar avatar-lg"
            data={artist.portrait}
            alt={artist.name}
            width={120}
            height={120}
            crop="center"
          />
        ) : (
          <span className="avatar avatar-lg" aria-hidden="true">
            {initialOf(artist.name)}
          </span>
        )}
        <div>
          <h1 style={{marginBottom: '0.25rem'}}>{artist.name}</h1>
          <p className="muted" style={{margin: 0}}>
            {[artist.city, artist.state].filter(Boolean).join(', ')}
          </p>
          {artist.verified ? (
            <span className="verified">✓ Verified by PAT and J.K. Co.</span>
          ) : null}
        </div>
      </header>

      {artist.statement || artist.biography ? (
        <div className="prose" style={{marginBottom: '3rem'}}>
          {artist.statement ? <p className="lede">{artist.statement}</p> : null}
          {artist.biography
            ? artist.biography
                .split(/\n{2,}/)
                .map((para) => <p key={para}>{para}</p>)
            : null}
        </div>
      ) : null}

      <hr className="gold-rule" style={{marginBottom: '2rem'}} />
      <h2>Works by {artist.name}</h2>
      <ArtworkGrid products={works} />
      <div style={{height: '5rem'}} />
    </div>
  );
}

const ARTIST_QUERY = `#graphql
  query Artist(
    $country: CountryCode
    $language: LanguageCode
    $handle: MetaobjectHandleInput!
  ) @inContext(country: $country, language: $language) {
    metaobject(handle: $handle) {
      handle
      displayName: field(key: "display_name") { value }
      artistId: field(key: "artist_id") { value }
      biography: field(key: "biography") { value }
      statement: field(key: "statement") { value }
      city: field(key: "city") { value }
      verified: field(key: "pjk_verified") { value }
      state: field(key: "state") {
        reference { ... on Metaobject { field(key: "name") { value } } }
      }
      portrait: field(key: "portrait") {
        reference { ... on MediaImage { image { url altText width height } } }
      }
    }
  }
` as const;

const ARTIST_WORKS_QUERY = `#graphql
  query ArtistWorks($country: CountryCode, $language: LanguageCode, $query: String)
  @inContext(country: $country, language: $language) {
    products(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes { ...ArtworkCard }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
