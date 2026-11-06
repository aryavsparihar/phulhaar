import {Form, Link, redirect, useLoaderData, useSubmit} from 'react-router';
import {getPaginationVariables} from '@shopify/hydrogen';
import type {Route} from './+types/collections.all';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {
  isArtwork,
  ARTWORK_CARD_FRAGMENT,
  SORTS,
  sortFrom,
  type ArtworkCardData,
} from '~/lib/catalogue';
import {popularTags} from '~/lib/search-index.server';

export const meta: Route.MetaFunction = ({data}) => [
  {
    title: data?.q
      ? `${data.q} — Phulhaar Gallery`
      : 'All artworks — Phulhaar Gallery',
  },
];

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  // Free text belongs to the gallery's own search, which reads descriptions and forgives typos.
  const text = url.searchParams.get('q')?.trim();
  if (text) throw redirect(`/search?q=${encodeURIComponent(text)}`);
  const q = url.searchParams.get('tag')?.trim().slice(0, 40) || '';
  const sort = sortFrom(url);
  const {sortKey, reverse} = SORTS[sort];
  const pagination = getPaginationVariables(request, {pageBy: 24});

  const {products} = await context.storefront.query(CATALOGUE_QUERY, {
    variables: {
      ...pagination,
      query: q ? `tag:"${q.replace(/"/g, '')}"` : null,
      sortKey,
      reverse,
    },
  });

  const tags = await popularTags(context.storefront).catch(
    () => [] as string[],
  );

  return {
    tags,
    products: (products.nodes as ArtworkCardData[]).filter(isArtwork),
    pageInfo: products.pageInfo,
    q,
    sort,
  };
}

export default function Catalogue() {
  const {products, pageInfo, q, sort, tags} = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const href = (params: Record<string, string>) => {
    const search = new URLSearchParams({
      ...(q ? {tag: q} : {}),
      sort,
      ...params,
    });
    for (const [key, value] of [...search.entries()]) {
      if (!value || (key === 'sort' && value === 'featured'))
        search.delete(key);
    }
    const query = search.toString();
    return `/collections/all${query ? `?${query}` : ''}`;
  };

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">The collection</p>
        <h1>{q ? q : 'All artworks'}</h1>
        <p className="lede">
          Original work, each piece one of a kind unless it says otherwise.
          Prices are in rupees.
        </p>
      </header>

      <div className="toolbar">
        <div className="chips" role="list">
          <Link className={`chip${q ? '' : ' active'}`} to={href({tag: ''})}>
            Everything
          </Link>
          {tags.map((filter) => (
            <Link
              key={filter}
              role="listitem"
              className={`chip${q.toLowerCase() === filter.toLowerCase() ? ' active' : ''}`}
              to={href({tag: filter})}
            >
              {filter}
            </Link>
          ))}
        </div>
        <Form
          method="get"
          onChange={(event) => void submit(event.currentTarget)}
        >
          {q ? <input type="hidden" name="tag" value={q} /> : null}
          <label className="visually-hidden" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={sort}>
            {Object.entries(SORTS).map(([value, {label}]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Form>
      </div>

      <ArtworkGrid products={products} eager={8} />

      <nav className="pagination" aria-label="More artworks">
        {pageInfo.hasNextPage && products.length ? (
          <Link
            to={href({cursor: pageInfo.endCursor ?? '', direction: 'next'})}
          >
            More artworks
          </Link>
        ) : null}
      </nav>
      <div style={{height: '3rem'}} />
    </div>
  );
}

const CATALOGUE_QUERY = `#graphql
  query Catalogue(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first
      last: $last
      before: $startCursor
      after: $endCursor
      query: $query
      sortKey: $sortKey
      reverse: $reverse
    ) {
      nodes {
        ...ArtworkCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
