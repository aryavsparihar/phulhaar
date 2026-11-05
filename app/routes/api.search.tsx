import type {Route} from './+types/api.search';
import {searchGallery} from '~/lib/search-index.server';
import {artistOf} from '~/lib/catalogue';

/** Results as the visitor types, for the search panel. */
export async function loader({request, context}: Route.LoaderArgs) {
  const q =
    new URL(request.url).searchParams.get('q')?.trim().slice(0, 120) ?? '';
  if (q.length < 2) return Response.json({q, works: [], artists: []});
  const {works, artists} = await searchGallery(context.storefront, q, 8);
  return Response.json(
    {
      q,
      works: works.map(({work, snippet}) => ({
        handle: work.handle,
        title: work.title,
        artist: artistOf(work).name,
        image: work.featuredImage?.url ?? null,
        price: work.priceRange.minVariantPrice,
        snippet,
      })),
      artists,
    },
    {headers: {'Cache-Control': 'private, max-age=30'}},
  );
}
