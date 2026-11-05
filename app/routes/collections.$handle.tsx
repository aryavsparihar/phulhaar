import {Link, useLoaderData} from 'react-router';
import {Analytics, getPaginationVariables} from '@shopify/hydrogen';
import type {Route} from './+types/collections.$handle';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ARTWORK_CARD_FRAGMENT, type ArtworkCardData} from '~/lib/catalogue';

export const meta: Route.MetaFunction = ({data}) => [
  {title: `${data?.collection.title ?? 'Collection'} — Phulhaar Gallery`},
];

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  if (!handle) throw new Response(null, {status: 404});

  const pagination = getPaginationVariables(request, {pageBy: 24});
  const {collection} = await context.storefront.query(COLLECTION_QUERY, {
    variables: {handle, ...pagination},
  });

  if (!collection) throw new Response(null, {status: 404});

  redirectIfHandleIsLocalized(request, {handle, data: collection});

  return {collection};
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();
  const {pageInfo} = collection.products;

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">Collection</p>
        <h1>{collection.title}</h1>
        {collection.description ? (
          <p className="lede">{collection.description}</p>
        ) : null}
      </header>
      <hr className="gold-rule" style={{marginBottom: '2rem'}} />
      <ArtworkGrid
        products={collection.products.nodes as ArtworkCardData[]}
        eager={8}
      />
      <nav className="pagination" aria-label="More artworks">
        {pageInfo.hasNextPage ? (
          <Link to={`?cursor=${pageInfo.endCursor}&direction=next`}>
            More artworks
          </Link>
        ) : null}
      </nav>
      <div style={{height: '3rem'}} />
      <Analytics.CollectionView
        data={{collection: {id: collection.id, handle: collection.handle}}}
      />
    </div>
  );
}

const COLLECTION_QUERY = `#graphql
  query ArtworkCollection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes { ...ArtworkCard }
        pageInfo { hasPreviousPage hasNextPage startCursor endCursor }
      }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
