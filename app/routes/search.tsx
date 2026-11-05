import {Form, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/search';
import {ArtworkCard} from '~/components/ArtworkCard';
import {searchGallery} from '~/lib/search-index.server';
import {initialOf} from '~/lib/gallery';

export const meta: Route.MetaFunction = ({data}) => [
  {
    title: data?.q
      ? `“${data.q}” — Phulhaar Gallery`
      : 'Search — Phulhaar Gallery',
  },
  {name: 'robots', content: 'noindex'},
];

export async function loader({request, context}: Route.LoaderArgs) {
  const q =
    new URL(request.url).searchParams.get('q')?.trim().slice(0, 120) ?? '';
  if (!q) return {q, works: [], artists: []};
  const {works, artists} = await searchGallery(context.storefront, q);
  return {q, works, artists};
}

export default function SearchPage() {
  const {q, works, artists} = useLoaderData<typeof loader>();
  return (
    <div className="wrap search-page">
      <h1 className="eyebrow">Search the gallery</h1>
      <Form method="get" className="search-big" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="A colour, a creature, a story, an artist, a half-remembered word"
          aria-label="Search the gallery"
        />
        <button className="btn" type="submit">
          Search
        </button>
      </Form>

      {q ? (
        <p className="muted">
          {works.length + artists.length === 0
            ? `Nothing in the gallery matches “${q}”. Try fewer words, or one word from the work.`
            : `${works.length} ${works.length === 1 ? 'work' : 'works'}${artists.length ? ` and ${artists.length} ${artists.length === 1 ? 'artist' : 'artists'}` : ''} for “${q}”`}
        </p>
      ) : null}

      {artists.length ? (
        <div className="artist-list" style={{margin: '1.5rem 0 2.5rem'}}>
          {artists.map((artist) => (
            <Link
              key={artist.handle}
              className="artist-card"
              to={`/artists/${artist.handle}`}
            >
              <span className="avatar" aria-hidden="true">
                {initialOf(artist.name)}
              </span>
              <span>
                <strong>{artist.name}</strong>
                <span className="muted">{artist.place}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {works.length ? (
        <div className="art-grid">
          {works.map(({work, snippet}, index) => (
            <div key={work.id}>
              <ArtworkCard
                product={work}
                loading={index < 8 ? 'eager' : 'lazy'}
              />
              {snippet ? <p className="snippet">{snippet}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div style={{height: '4rem'}} />
    </div>
  );
}
