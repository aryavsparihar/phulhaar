import {
  Form,
  Link,
  redirect,
  useLoaderData,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/studio._index';
import type {RootLoader} from '~/root';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {
  ARTWORK_CARD_FRAGMENT,
  belongsTo,
  type ArtworkCardData,
} from '~/lib/catalogue';
import {
  ARTIST_KEY,
  currentArtist,
  isExpired,
} from '~/lib/artist-session.server';

export const meta: Route.MetaFunction = () => [
  {title: 'Your studio — Phulhaar Gallery'},
  {name: 'robots', content: 'noindex'},
];

export async function loader({context}: Route.LoaderArgs) {
  const artist = currentArtist(context.session);
  if (!artist) throw redirect('/studio/sign-in');
  if (isExpired(artist)) {
    context.session.unset(ARTIST_KEY);
    throw redirect('/studio/sign-in');
  }

  // The live works carrying this artist's name. Works in review are drafts and are not visible to
  // the Storefront API, so they appear here once staff publish them.
  const {products} = await context.storefront.query(STUDIO_WORKS_QUERY, {
    variables: {query: `vendor:"${artist.displayName.replace(/"/g, '')}"`},
  });
  const works = (products.nodes as ArtworkCardData[]).filter((work) =>
    belongsTo(work, {artistId: artist.artistId, name: artist.displayName}),
  );

  return {
    artist: {artistId: artist.artistId, displayName: artist.displayName},
    works,
    live: works.filter((work) => work.availableForSale !== false).length,
    sold: works.filter((work) => work.availableForSale === false).length,
  };
}

export default function Studio() {
  const {artist, works, live, sold} = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');
  const email = root?.enquiryEmail ?? 'hello@phulhaargallery.com';
  const submit = `mailto:${email}?subject=${encodeURIComponent(
    `New work from ${artist.displayName} (${artist.artistId})`,
  )}&body=${encodeURIComponent(
    [
      `Artist ID: ${artist.artistId}`,
      '',
      'Title:',
      'Year:',
      'Medium and surface:',
      'Height × width × depth (cm):',
      'Price (₹):',
      'Framed? Signed? Certificate?',
      'A few lines about the work:',
      '',
      'Please attach good photographs: the whole work, straight on, in daylight, and one or two details.',
    ].join('\n'),
  )}`;

  return (
    <div className="wrap studio">
      <div className="section-head">
        <div>
          <p className="eyebrow">The artist studio · {artist.artistId}</p>
          <h1 style={{margin: 0}}>Welcome, {artist.displayName}</h1>
        </div>
        <Form method="post" action="/studio/sign-out">
          <button className="btn btn-quiet" type="submit">
            Sign out
          </button>
        </Form>
      </div>
      <hr className="gold-rule" />

      <div className="studio-grid">
        <div className="stat">
          <span className="muted">On the wall</span>
          <strong>{live}</strong>
        </div>
        <div className="stat">
          <span className="muted">Sold</span>
          <strong>{sold}</strong>
        </div>
        <div className="stat">
          <span className="muted">Add a work</span>
          <p style={{margin: '0.5rem 0 0.75rem'}}>
            Send the details and photographs. Staff review every work before it
            goes live.
          </p>
          <a className="btn" href={submit}>
            Submit a new work
          </a>
        </div>
      </div>

      <h2>Your works</h2>
      {works.length === 0 ? (
        <div className="empty">
          <h3>Nothing on the wall yet</h3>
          <p className="muted">
            Submit your first work and it will appear here once staff have
            reviewed it.
          </p>
        </div>
      ) : (
        <>
          <ArtworkGrid products={works} />
          <h3 style={{marginTop: '2.5rem'}}>Tags on your works</h3>
          <ul className="studio-tags">
            {works.map((work) => (
              <li key={work.id}>
                <em>{work.title}</em>{' '}
                <Link
                  className="link-arrow"
                  to={`/studio/works/${work.id.split('/').pop()}`}
                >
                  Edit tags
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="muted" style={{marginTop: '3rem', fontSize: '1rem'}}>
        Your profile, identity and payout details are managed on{' '}
        <a href="https://pjk.co.in" rel="noopener">
          pjk.co.in
        </a>
        . Phulhaar never holds them.{' '}
        <Link to="/for-artists">How the studio works</Link>.
      </p>
    </div>
  );
}

const STUDIO_WORKS_QUERY = `#graphql
  query StudioWorks($country: CountryCode, $language: LanguageCode, $query: String)
  @inContext(country: $country, language: $language) {
    products(first: 100, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes { ...ArtworkCard }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
