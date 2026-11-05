import {Link, useLoaderData} from 'react-router';
import type {Route} from './+types/admin._index';
import {parseEnv} from '~/lib/env.server';
import {adminClient, failure} from '~/lib/admin-api.server';
import {
  countArtworks,
  listArtworks,
  type ArtworkRow,
} from '~/lib/catalogue-admin.server';
import {requireStaff} from '~/lib/staff-session.server';
import {ErrorList} from '~/components/admin/FieldInput';
import {ArtworkTable} from '~/routes/admin.artworks._index';

export async function loader({context, request}: Route.LoaderArgs) {
  const staff = requireStaff(request, context.session);
  const admin = adminClient(parseEnv(context.env));
  if (!admin)
    return {
      staff: staff.name,
      counts: null,
      review: [],
      recent: [],
      error: null,
    };
  try {
    const [counts, review, recent] = await Promise.all([
      countArtworks(admin),
      listArtworks(admin, {
        query: 'metafields.phulhaar.review_status:in_review',
      }),
      listArtworks(admin, {query: ''}),
    ]);
    return {
      staff: staff.name,
      counts,
      review: review.rows.slice(0, 8),
      recent: recent.rows.slice(0, 8),
      error: null,
    };
  } catch (error) {
    return {
      staff: staff.name,
      counts: null,
      review: [] as ArtworkRow[],
      recent: [] as ArtworkRow[],
      error: failure(error),
    };
  }
}

export default function Dashboard() {
  const {staff, counts, review, recent, error} = useLoaderData<typeof loader>();
  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Good to see you, {staff.split(' ')[0]}</h1>
        </div>
        <div className="admin-actions">
          <Link className="btn" to="/admin/artworks/new">
            Add an artwork
          </Link>
          <Link className="btn btn-quiet" to="/admin/artists/new">
            Add an artist
          </Link>
        </div>
      </header>
      <ErrorList error={error} />

      <div className="studio-grid">
        <Stat
          label="Live on the site"
          value={counts?.active}
          to="/admin/artworks?status=active"
        />
        <Stat
          label="Waiting for review"
          value={counts?.inReview}
          to="/admin/artworks?status=review"
        />
        <Stat
          label="Drafts"
          value={counts?.draft}
          to="/admin/artworks?status=draft"
        />
        <Stat
          label="Archived"
          value={counts?.archived}
          to="/admin/artworks?status=archived"
        />
      </div>

      <section className="admin-section">
        <div className="section-head">
          <h2>Waiting for review</h2>
          <Link className="link-arrow" to="/admin/artworks?status=review">
            The whole queue
          </Link>
        </div>
        {review.length ? (
          <ArtworkTable rows={review} />
        ) : (
          <p className="muted">Nothing is waiting.</p>
        )}
      </section>

      <section className="admin-section">
        <div className="section-head">
          <h2>Recently changed</h2>
          <Link className="link-arrow" to="/admin/artworks">
            All artworks
          </Link>
        </div>
        {recent.length ? (
          <ArtworkTable rows={recent} />
        ) : (
          <p className="muted">No artworks yet.</p>
        )}
      </section>
    </>
  );
}

function Stat({label, value, to}: {label: string; value?: number; to: string}) {
  return (
    <Link className="stat" to={to}>
      <span className="muted">{label}</span>
      <strong>{value ?? '—'}</strong>
    </Link>
  );
}
