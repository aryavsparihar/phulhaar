import {useEffect, useRef} from 'react';
import {Form, Link, useLoaderData, useSubmit} from 'react-router';
import {Image} from '@shopify/hydrogen';
import type {Route} from './+types/artists._index';
import {initialOf} from '~/lib/gallery';
import {
  directoryGroups,
  directoryHref,
  LETTERS,
  lettersInUse,
  OTHER,
  parseDirectoryQuery,
  statesInUse,
  type DirectoryQuery,
} from '~/lib/artist-directory';

export const meta: Route.MetaFunction = () => [
  {title: 'Artists — Phulhaar Gallery'},
];

export async function loader({context, request}: Route.LoaderArgs) {
  // Artists are `phulhaar_artist` metaobjects, created from PJK's profile (see docs/DATA-MODEL.md).
  // A store without the schema yet answers with nothing rather than an error.
  const artists = await context.storefront
    .query(ARTISTS_QUERY, {cache: context.storefront.CacheShort()})
    .then(({metaobjects}) => metaobjects.nodes)
    .catch(() => []);

  const all = artists.map((artist) => ({
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
  }));

  const query = parseDirectoryQuery(new URL(request.url).searchParams);
  return {
    query,
    total: all.length,
    letters: [...lettersInUse(all)],
    states: statesInUse(all),
    groups: directoryGroups(all, query),
  };
}

export default function Artists() {
  const {query, total, letters, states, groups} =
    useLoaderData<typeof loader>();
  const inUse = new Set(letters);
  const shown = groups.reduce((sum, group) => sum + group.artists.length, 0);
  const at = (change: Partial<DirectoryQuery>) =>
    directoryHref({...query, ...change});

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

      {total === 0 ? (
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
        <>
          <div className="directory-controls">
            <div className="segmented" role="group" aria-label="Browse by">
              <Link
                className={query.view === 'az' ? 'active' : ''}
                aria-current={query.view === 'az' ? 'page' : undefined}
                to={at({view: 'az', state: null})}
              >
                A–Z
              </Link>
              <Link
                className={query.view === 'state' ? 'active' : ''}
                aria-current={query.view === 'state' ? 'page' : undefined}
                to={at({view: 'state', letter: null})}
              >
                By state
              </Link>
            </div>
            <NameFilter query={query} />
          </div>

          {query.view === 'az' ? (
            <nav className="alphabet" aria-label="Jump to a letter">
              <Link
                className={query.letter ? '' : 'active'}
                to={at({letter: null})}
              >
                All
              </Link>
              {[...LETTERS, OTHER].map((letter) =>
                inUse.has(letter) ? (
                  <Link
                    key={letter}
                    className={query.letter === letter ? 'active' : ''}
                    aria-current={query.letter === letter ? 'true' : undefined}
                    to={at({letter})}
                  >
                    {letter}
                  </Link>
                ) : letter === OTHER ? null : (
                  <span key={letter} aria-hidden="true">
                    {letter}
                  </span>
                ),
              )}
            </nav>
          ) : (
            <div className="chips" role="list" aria-label="States">
              <Link
                role="listitem"
                className={`chip${query.state ? '' : ' active'}`}
                to={at({state: null})}
              >
                All states
              </Link>
              {states.map(({state, count}) => (
                <Link
                  key={state}
                  role="listitem"
                  className={`chip${query.state === state ? ' active' : ''}`}
                  to={at({state})}
                >
                  {state} ({count})
                </Link>
              ))}
            </div>
          )}

          <p className="muted" aria-live="polite">
            {shown === total
              ? `${total} ${total === 1 ? 'artist' : 'artists'}`
              : `${shown} of ${total} artists`}
          </p>

          {groups.length === 0 ? (
            <div className="empty">
              <h3>No artist matches that</h3>
              <Link className="link-arrow" to="/artists">
                Show every artist
              </Link>
            </div>
          ) : (
            groups.map((group) => (
              <section
                key={group.key}
                className="directory-group"
                aria-labelledby={`group-${group.key}`}
              >
                <h2 id={`group-${group.key}`} className="directory-heading">
                  {group.label}
                </h2>
                <div className="artist-list">
                  {group.artists.map((artist) => (
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
                          {[artist.city, artist.state]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </>
      )}
      <div style={{height: '5rem'}} />
    </div>
  );
}

/** Filters as you type, keeping the view, letter and state; works as a plain form without script. */
function NameFilter({query}: {query: DirectoryQuery}) {
  const submit = useSubmit();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Form method="get" role="search" className="directory-search">
      {query.view === 'state' ? (
        <input type="hidden" name="view" value="state" />
      ) : null}
      {query.view === 'az' && query.letter ? (
        <input type="hidden" name="letter" value={query.letter} />
      ) : null}
      {query.view === 'state' && query.state ? (
        <input type="hidden" name="state" value={query.state} />
      ) : null}
      <label className="visually-hidden" htmlFor="artist-name">
        Find an artist by name or place
      </label>
      <input
        id="artist-name"
        type="search"
        name="name"
        defaultValue={query.name}
        placeholder="Find an artist by name or place"
        autoComplete="off"
        onChange={(event) => {
          const form = event.currentTarget.form;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            if (form)
              void submit(form, {replace: true, preventScrollReset: true});
          }, 200);
        }}
      />
    </Form>
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
