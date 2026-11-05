import {Form, Link, useLoaderData, useSearchParams} from 'react-router';
import type {Route} from './+types/admin.artworks._index';
import {parseEnv} from '~/lib/env.server';
import {adminClient, failure} from '~/lib/admin-api.server';
import {numericId} from '~/lib/ids';
import {listArtworks, type ArtworkRow} from '~/lib/catalogue-admin.server';
import {requireStaff} from '~/lib/staff-session.server';
import {ErrorList} from '~/components/admin/FieldInput';
import {labelOf} from '~/lib/schema-fields';

const FILTERS = {
  all: {label: 'All', query: ''},
  active: {label: 'Live', query: 'status:active'},
  review: {
    label: 'In review',
    query: 'metafields.phulhaar.review_status:in_review',
  },
  draft: {label: 'Drafts', query: 'status:draft'},
  archived: {label: 'Archived', query: 'status:archived'},
} as const;

export async function loader({context, request}: Route.LoaderArgs) {
  requireStaff(request, context.session);
  const url = new URL(request.url);
  const status = (url.searchParams.get('status') ??
    'all') as keyof typeof FILTERS;
  const q = url.searchParams.get('q')?.trim().slice(0, 100) ?? '';
  const after = url.searchParams.get('after');
  const admin = adminClient(parseEnv(context.env));
  if (!admin) return {rows: [] as ArtworkRow[], pageInfo: null, error: null};

  // Shopify's admin search covers title, vendor, tags, type and SKU; free text goes in as-is.
  const filter = FILTERS[status] ?? FILTERS.all;
  const query = [filter.query, q.replace(/[()]/g, '')]
    .filter(Boolean)
    .join(' AND ');
  try {
    const {rows, pageInfo} = await listArtworks(admin, {query, after});
    return {rows, pageInfo, error: null};
  } catch (error) {
    return {rows: [] as ArtworkRow[], pageInfo: null, error: failure(error)};
  }
}

export default function AdminArtworks() {
  const {rows, pageInfo, error} = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  const status = params.get('status') ?? 'all';

  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1>Artworks</h1>
        </div>
        <Link className="btn" to="/admin/artworks/new">
          Add an artwork
        </Link>
      </header>
      <ErrorList error={error} />

      <div className="toolbar">
        <div className="chips">
          {Object.entries(FILTERS).map(([key, {label}]) => (
            <Link
              key={key}
              className={`chip${status === key ? ' active' : ''}`}
              to={`?status=${key}${params.get('q') ? `&q=${encodeURIComponent(params.get('q')!)}` : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <Form method="get" className="admin-search">
          <input type="hidden" name="status" value={status} />
          <input
            type="search"
            name="q"
            defaultValue={params.get('q') ?? ''}
            placeholder="Title, artist, tag"
            aria-label="Search artworks"
          />
          <button className="btn" type="submit">
            Search
          </button>
        </Form>
      </div>

      {rows.length ? (
        <ArtworkTable rows={rows} />
      ) : (
        <p className="empty">No artworks match.</p>
      )}

      {pageInfo?.hasNextPage ? (
        <nav className="pagination">
          <Link
            to={`?status=${status}&q=${encodeURIComponent(params.get('q') ?? '')}&after=${pageInfo.endCursor}`}
          >
            Next 50
          </Link>
        </nav>
      ) : null}
    </>
  );
}

const STATUS_LABEL = {
  ACTIVE: 'Live',
  DRAFT: 'Draft',
  ARCHIVED: 'Archived',
} as const;

export function ArtworkTable({rows}: {rows: ArtworkRow[]}) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Image</span>
            </th>
            <th scope="col">Work</th>
            <th scope="col">Price</th>
            <th scope="col">Status</th>
            <th scope="col">Review</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.image ? (
                  <img src={row.image} alt="" className="thumb" />
                ) : (
                  <span className="thumb" />
                )}
              </td>
              <td>
                <Link
                  to={`/admin/artworks/${numericId(row.id)}`}
                  className="row-title"
                >
                  {row.title}
                </Link>
                <span className="muted">{row.vendor}</span>
                {row.tags.length ? (
                  <span className="row-tags">
                    {row.tags.slice(0, 4).join(' · ')}
                  </span>
                ) : null}
              </td>
              <td>
                {row.price
                  ? `₹${Number(row.price).toLocaleString('en-IN')}`
                  : '—'}
              </td>
              <td>
                <span className={`badge badge-${row.status.toLowerCase()}`}>
                  {STATUS_LABEL[row.status]}
                </span>
                {row.availability && row.availability !== 'available' ? (
                  <span className="muted"> {labelOf(row.availability)}</span>
                ) : null}
              </td>
              <td>{row.reviewStatus ? labelOf(row.reviewStatus) : '—'}</td>
              <td className="muted">
                {new Date(row.updatedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
