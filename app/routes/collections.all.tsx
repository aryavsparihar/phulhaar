import {Form, Link, redirect, useLoaderData, useSubmit} from 'react-router';
import type {Route} from './+types/collections.all';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {
  activeFilters,
  catalogueFacets,
  catalogueHref,
  filterCatalogue,
  NO_FILTERS,
  pageOf,
  parseCatalogueFilters,
  sortCatalogue,
  SORTS,
  sortFrom,
  type CatalogueFilters,
  type FacetOption,
} from '~/lib/catalogue';
import {catalogueEntries, popularTags} from '~/lib/search-index.server';

const PER_PAGE = 24;

export const meta: Route.MetaFunction = ({data}) => [
  {
    title: data?.filters.tag
      ? `${data.filters.tag} — Phulhaar Gallery`
      : 'All artworks — Phulhaar Gallery',
  },
  // Filtered and paged views are the same works rearranged; only the plain list is indexed.
  ...(data && (data.pills.length || data.page > 1)
    ? [{name: 'robots', content: 'noindex, follow'}]
    : []),
];

export async function loader({context, request}: Route.LoaderArgs) {
  const url = new URL(request.url);
  // Free text belongs to the gallery's own search, which reads descriptions and forgives typos.
  const text = url.searchParams.get('q')?.trim();
  if (text) throw redirect(`/search?q=${encodeURIComponent(text)}`);

  const filters = parseCatalogueFilters(url.searchParams);
  const sort = sortFrom(url);
  const [entries, tags] = await Promise.all([
    catalogueEntries(context.storefront).catch(() => []),
    popularTags(context.storefront).catch(() => [] as string[]),
  ]);

  const matching = sortCatalogue(filterCatalogue(entries, filters), sort);
  const {items, page, pages, total} = pageOf(
    matching,
    Number(url.searchParams.get('page') ?? 1),
    PER_PAGE,
  );

  return {
    filters,
    sort,
    tags,
    facets: catalogueFacets(entries, filters),
    pills: activeFilters(filters),
    products: items.map((entry) => entry.work),
    page,
    pages,
    total,
    everything: entries.length,
  };
}

export default function Catalogue() {
  const {
    filters,
    sort,
    tags,
    facets,
    pills,
    products,
    page,
    pages,
    total,
    everything,
  } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const withFilter = (change: Partial<CatalogueFilters>) =>
    catalogueHref({...filters, ...change}, sort);

  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">The collection</p>
        <h1>{filters.tag || 'All artworks'}</h1>
        <p className="lede">
          Original work, each piece one of a kind unless it says otherwise.
          Prices are in rupees.
        </p>
      </header>

      {tags.length ? (
        <div className="chips" role="list" style={{marginBottom: '1rem'}}>
          <Link
            role="listitem"
            className={`chip${filters.tag ? '' : ' active'}`}
            to={withFilter({tag: ''})}
          >
            Everything
          </Link>
          {tags.map((tag) => (
            <Link
              key={tag}
              role="listitem"
              className={`chip${filters.tag.toLowerCase() === tag.toLowerCase() ? ' active' : ''}`}
              to={withFilter({tag})}
            >
              {tag}
            </Link>
          ))}
        </div>
      ) : null}

      <Form
        // Remount when the address changes (a pill removed, filters cleared), so every control
        // shows what is really in force.
        key={catalogueHref(filters, sort)}
        method="get"
        className="facets"
        aria-label="Filter the artworks"
        onChange={(event) => void submit(event.currentTarget)}
      >
        {filters.tag ? (
          <input type="hidden" name="tag" value={filters.tag} />
        ) : null}
        <label className="facet-check">
          <input
            type="checkbox"
            name="available"
            value="1"
            defaultChecked={filters.available}
          />
          Available only
          <span className="muted"> ({facets.available})</span>
        </label>
        <FacetSelect
          name="size"
          label="Size"
          value={filters.size ?? ''}
          options={facets.size}
        />
        <FacetSelect
          name="orientation"
          label="Orientation"
          value={filters.orientation ?? ''}
          options={facets.orientation}
        />
        <FacetSelect
          name="medium"
          label="Medium"
          value={filters.medium}
          options={facets.medium}
        />
        <FacetSelect
          name="tradition"
          label="Tradition"
          value={filters.tradition}
          options={facets.tradition}
        />
        <div className="facet">
          <label htmlFor="sort">Sort</label>
          <select id="sort" name="sort" defaultValue={sort}>
            {Object.entries(SORTS).map(([value, {label}]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <noscript>
          <button className="btn btn-quiet" type="submit">
            Apply
          </button>
        </noscript>
      </Form>

      <div className="facet-summary" aria-live="polite">
        <p className="muted" style={{margin: 0}}>
          {pills.length
            ? `${total} of ${everything} ${everything === 1 ? 'work' : 'works'}`
            : `${total} ${total === 1 ? 'work' : 'works'}`}
        </p>
        {pills.length ? (
          <ul className="pills" aria-label="Filters in use">
            {pills.map((pill) => (
              <li key={pill.key}>
                <Link
                  className="pill"
                  to={withFilter(
                    pill.key === 'available'
                      ? {available: false}
                      : pill.key === 'size' || pill.key === 'orientation'
                        ? {[pill.key]: null}
                        : {[pill.key]: ''},
                  )}
                  aria-label={`Remove ${pill.label}`}
                >
                  {pill.label} <span aria-hidden="true">×</span>
                </Link>
              </li>
            ))}
            <li>
              <Link className="link-arrow" to={catalogueHref(NO_FILTERS, sort)}>
                Clear filters
              </Link>
            </li>
          </ul>
        ) : null}
      </div>

      <ArtworkGrid products={products} eager={8} />

      {pages > 1 ? (
        <nav className="pagination" aria-label="Pages of artworks">
          {page > 1 ? (
            <Link rel="prev" to={catalogueHref(filters, sort, page - 1)}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link rel="next" to={catalogueHref(filters, sort, page + 1)}>
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
      <div style={{height: '3rem'}} />
    </div>
  );
}

function FacetSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string;
  options: FacetOption[];
}) {
  // A chosen value stays listed even when nothing matches it any more, so it can be seen and undone.
  const list =
    value && !options.some((o) => o.value.toLowerCase() === value.toLowerCase())
      ? [{value, label: value, count: 0}, ...options]
      : options;
  return (
    <div className="facet">
      <label htmlFor={`facet-${name}`}>{label}</label>
      <select
        id={`facet-${name}`}
        name={name}
        defaultValue={value}
        disabled={!list.length}
      >
        <option value="">Any</option>
        {list.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </div>
  );
}
