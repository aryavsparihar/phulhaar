import {Form, Link, useLoaderData, useSearchParams} from 'react-router';
import type {Route} from './+types/admin.artists._index';
import {parseEnv} from '~/lib/env.server';
import {adminClient, failure} from '~/lib/admin-api.server';
import {numericId} from '~/lib/ids';
import {
  listMetaobjects,
  type MetaobjectDetail,
} from '~/lib/catalogue-admin.server';
import {requireStaff} from '~/lib/staff-session.server';
import {ErrorList} from '~/components/admin/FieldInput';
import {initialOf} from '~/lib/gallery';

export async function loader({context, request}: Route.LoaderArgs) {
  requireStaff(request, context.session);
  const q =
    new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? '';
  const admin = adminClient(parseEnv(context.env));
  if (!admin) return {artists: [] as MetaobjectDetail[], error: null};
  try {
    const all = await listMetaobjects(admin, 'phulhaar_artist');
    const artists = q
      ? all.filter((artist) =>
          [
            artist.fields.display_name,
            artist.fields.artist_id,
            artist.fields.city,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q),
        )
      : all;
    return {artists, error: null};
  } catch (error) {
    return {artists: [] as MetaobjectDetail[], error: failure(error)};
  }
}

export default function AdminArtists() {
  const {artists, error} = useLoaderData<typeof loader>();
  const [params] = useSearchParams();
  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">People</p>
          <h1>Artists</h1>
        </div>
        <Link className="btn" to="/admin/artists/new">
          Add an artist
        </Link>
      </header>
      <ErrorList error={error} />
      <div className="toolbar">
        <span className="muted">{artists.length} artists</span>
        <Form method="get" className="admin-search">
          <input
            type="search"
            name="q"
            defaultValue={params.get('q') ?? ''}
            placeholder="Name, Artist ID, city"
            aria-label="Search artists"
          />
          <button className="btn" type="submit">
            Search
          </button>
        </Form>
      </div>
      {artists.length === 0 ? (
        <p className="empty">No artists yet.</p>
      ) : (
        <div className="artist-list">
          {artists.map((artist) => (
            <Link
              key={artist.id}
              className="artist-card"
              to={`/admin/artists/${numericId(artist.id)}`}
            >
              {artist.images.portrait ? (
                <img className="avatar" src={artist.images.portrait} alt="" />
              ) : (
                <span className="avatar" aria-hidden="true">
                  {initialOf(artist.fields.display_name || artist.handle)}
                </span>
              )}
              <span>
                <strong>{artist.fields.display_name || artist.handle}</strong>
                <span className="muted">
                  {artist.fields.artist_id}
                  {artist.fields.city ? ` · ${artist.fields.city}` : ''}
                  {artist.fields.standing === 'suspended' ? ' · on hold' : ''}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
