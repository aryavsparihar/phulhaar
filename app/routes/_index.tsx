import {Form, Link, useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {ARTWORK_CARD_FRAGMENT, type ArtworkCardData} from '~/lib/catalogue';
import {GALLERY} from '~/lib/gallery';
import {popularTags} from '~/lib/search-index.server';

export const meta: Route.MetaFunction = () => [
  {title: 'Phulhaar Gallery — original work by Indian artists'},
];

export async function loader({context}: Route.LoaderArgs) {
  const {storefront} = context;
  const [latest, featured] = await Promise.all([
    storefront.query(HOME_QUERY, {
      variables: {first: 8, sortKey: 'CREATED_AT', reverse: true},
      cache: storefront.CacheShort(),
    }),
    storefront.query(HOME_QUERY, {
      variables: {first: 4, sortKey: 'BEST_SELLING', reverse: false},
      cache: storefront.CacheShort(),
    }),
  ]);

  const tags = await popularTags(storefront, 16).catch(() => [] as string[]);

  return {
    tags,
    latest: latest.products.nodes as ArtworkCardData[],
    featured: featured.products.nodes as ArtworkCardData[],
  };
}

export default function Homepage() {
  const {latest, featured, tags} = useLoaderData<typeof loader>();

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div>
            <p className="eyebrow">Phulhaar Gallery {GALLERY.byline}</p>
            <h1>
              Original work by <em>Indian artists</em>, shown properly
            </h1>
            <p className="lede">
              Madhubani, Pichwai, Gond, Warli and Pattachitra beside painting,
              drawing, sculpture and textile. Every work comes from the artist
              who made it.
            </p>
            <div className="hero-actions">
              <Link className="btn" to="/collections/all" prefetch="intent">
                See the artworks
              </Link>
              <Link className="btn btn-quiet" to="/artists" prefetch="intent">
                Meet the artists
              </Link>
            </div>
          </div>
          <img
            className="hero-mark"
            src="/brand/phulhaar-garland.webp"
            alt="The Phulhaar garland"
            width="360"
            height="543"
          />
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <p className="eyebrow">On the wall</p>
                <h2>Featured works</h2>
              </div>
              <Link className="link-arrow" to="/collections/all">
                All artworks
              </Link>
            </div>
            <ArtworkGrid products={featured} />
          </div>
        </section>
      ) : null}

      <section className="section section-tint">
        <div className="wrap search-feature">
          <p className="eyebrow">Find a work</p>
          <h2>Remember a colour, a creature, a word? That is enough.</h2>
          <Form
            method="get"
            action="/search"
            className="search-big"
            role="search"
          >
            <input
              type="search"
              name="q"
              placeholder="the blue one with the peacock"
              aria-label="Search the gallery"
            />
            <button className="btn" type="submit">
              Search
            </button>
          </Form>
          {tags.length ? (
            <div className="chips" style={{justifyContent: 'center'}}>
              {tags.map((tag) => (
                <Link
                  key={tag}
                  className="chip"
                  to={`/collections/all?tag=${encodeURIComponent(tag)}`}
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <p className="eyebrow">Just hung</p>
              <h2>New to the gallery</h2>
            </div>
            <Link className="link-arrow" to="/collections/all?sort=newest">
              See what is new
            </Link>
          </div>
          <ArtworkGrid products={latest} eager={0} />
        </div>
      </section>

      <section className="section section-tint">
        <div className="wrap feature">
          <div>
            <p className="eyebrow">For artists</p>
            <h2>Already with PAT and J.K. Co.? Your studio is here.</h2>
            <p className="lede">
              Artists approved on PJK sign in to Phulhaar with their Artist ID
              and a one-time code. No new account, no new password.
            </p>
            <div className="hero-actions">
              <Link className="btn" to="/studio">
                Artist sign-in
              </Link>
              <Link className="btn btn-quiet" to="/for-artists">
                How it works
              </Link>
            </div>
          </div>
          <img
            className="feature-mark"
            src="/brand/phulhaar-logo.png"
            alt="Phulhaar Gallery"
            width="280"
            height="215"
            loading="lazy"
          />
        </div>
      </section>
    </>
  );
}

const HOME_QUERY = `#graphql
  query HomeArtworks(
    $country: CountryCode
    $language: LanguageCode
    $first: Int!
    $sortKey: ProductSortKeys!
    $reverse: Boolean!
  ) @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: $sortKey, reverse: $reverse) {
      nodes {
        ...ArtworkCard
      }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
