import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/admin.artists.$id';
import {parseEnv} from '~/lib/env.server';
import {
  adminClient,
  failure,
  gid,
  numericId,
  requireAdmin,
} from '~/lib/admin-api.server';
import {
  deleteMetaobject,
  getMetaobject,
  listArtworks,
  loadOptions,
  type ArtworkRow,
  upsertMetaobject,
  worksForArtist,
  type MetaobjectDetail,
  type Options,
} from '~/lib/catalogue-admin.server';
import {
  ARTIST_METAOBJECT,
  parseFields,
  referencedTypes,
  type FieldDef,
} from '~/lib/schema-fields';
import {slugify} from '~/lib/artwork';
import {requireStaff} from '~/lib/staff-session.server';
import {numericId as idOf} from '~/lib/ids';
import {ArtworkTable} from '~/routes/admin.artworks._index';
import {ErrorList, FieldInput} from '~/components/admin/FieldInput';

const FIELDS = ARTIST_METAOBJECT.fields as FieldDef[];
const TYPE = ARTIST_METAOBJECT.type;

export async function loader({context, params, request}: Route.LoaderArgs) {
  requireStaff(request, context.session);
  const isNew = params.id === 'new';
  const admin = adminClient(parseEnv(context.env));
  if (!admin)
    return {
      isNew,
      artist: null,
      options: {} as Options,
      works: 0,
      catalogue: [] as ArtworkRow[],
      error: null,
    };
  try {
    const [artist, options] = await Promise.all([
      isNew
        ? Promise.resolve(null)
        : getMetaobject(admin, gid('Metaobject', params.id)),
      loadOptions(admin, referencedTypes(FIELDS)),
    ]);
    if (!isNew && !artist) throw new Response(null, {status: 404});
    // The artist's whole catalogue, every status, newest change first.
    const [works, catalogue] = artist
      ? await Promise.all([
          worksForArtist(admin, artist.id),
          listArtworks(admin, {
            query: `metafields.phulhaar.artist:"${artist.id}"`,
          }).then((page) => page.rows),
        ])
      : [0, [] as ArtworkRow[]];
    return {isNew, artist, options, works, catalogue, error: null};
  } catch (error) {
    return {
      isNew,
      artist: null as MetaobjectDetail | null,
      options: {} as Options,
      works: 0,
      catalogue: [] as ArtworkRow[],
      error: failure(error),
    };
  }
}

export async function action({context, params, request}: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get('intent') ?? 'save');
  requireStaff(
    request,
    context.session,
    intent === 'delete' ? {role: 'admin'} : {},
  );
  try {
    const admin = requireAdmin(parseEnv(context.env));

    if (intent === 'delete') {
      const id = gid('Metaobject', params.id);
      const works = await worksForArtist(admin, id);
      if (works > 0) {
        return {
          error: {
            message: 'This artist still has works',
            detail: [
              `Move or delete their ${works} works first, so no work is left without an artist.`,
            ],
          },
          fieldErrors: {},
        };
      }
      await deleteMetaobject(admin, id);
      return redirect('/admin/artists');
    }

    const parsed = parseFields(form, FIELDS);
    if (Object.keys(parsed.errors).length) {
      return {
        error: {message: 'Some fields need attention', detail: []},
        fieldErrors: parsed.errors,
      };
    }
    const existing =
      params.id === 'new'
        ? null
        : await getMetaobject(admin, gid('Metaobject', params.id));
    const handle =
      existing?.handle ??
      slugify(`${parsed.values.display_name} ${parsed.values.artist_id}`);

    const images: Record<string, File> = {};
    for (const field of FIELDS.filter((f) => f.type === 'file_reference')) {
      const file = form.get(`file.${field.key}`);
      if (file instanceof File && file.size > 0) images[field.key] = file;
    }
    // Cleared text fields are written empty so an edit can remove what was there.
    const values = {
      ...Object.fromEntries(parsed.cleared.map((key) => [key, ''])),
      ...parsed.values,
    };
    const saved = await upsertMetaobject(admin, {
      type: TYPE,
      handle,
      values,
      images,
    });
    return redirect(`/admin/artists/${numericId(saved.id)}?saved=1`);
  } catch (error) {
    return {error: failure(error), fieldErrors: {} as Record<string, string>};
  }
}

export default function EditArtist() {
  const {isNew, artist, options, works, catalogue, error} =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state === 'submitting';
  const fieldErrors = result?.fieldErrors ?? {};

  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">
            <Link to="/admin/artists">Artists</Link> / {isNew ? 'New' : 'Edit'}
          </p>
          <h1>{isNew ? 'Add an artist' : artist?.fields.display_name}</h1>
        </div>
        {artist ? (
          <div className="admin-actions">
            <Link
              className="btn"
              to={`/admin/artworks/new?artist=${idOf(artist.id)}`}
            >
              Add a work by this artist
            </Link>
            <a
              className="btn btn-quiet"
              href={`/artists/${artist.handle}`}
              target="_blank"
              rel="noreferrer"
            >
              View on the site
            </a>
          </div>
        ) : null}
      </header>
      <ErrorList error={result?.error ?? error} />
      <p className="notice">
        Profiles normally arrive from PJK when an artist is approved. Edit here
        to correct one, or to add an artist before PJK&rsquo;s sync is live.
        Never add an email address, PAN, Aadhaar or bank details: Phulhaar does
        not keep them.
      </p>

      <Form method="post" encType="multipart/form-data">
        <input type="hidden" name="intent" value="save" />
        <section className="panel">
          <div className="field-grid">
            {FIELDS.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={artist?.fields[field.key]}
                image={artist?.images[field.key]}
                options={options}
                error={fieldErrors[field.key]}
              />
            ))}
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving' : isNew ? 'Create the artist' : 'Save changes'}
          </button>
        </section>
      </Form>

      {artist ? (
        <section className="panel" id="catalogue">
          <h2>
            Catalogue{' '}
            <span className="muted">
              ({works} {works === 1 ? 'work' : 'works'})
            </span>
          </h2>
          {catalogue.length ? (
            <ArtworkTable rows={catalogue} />
          ) : (
            <p className="muted">No works yet.</p>
          )}
          <p style={{marginTop: '1rem'}}>
            <Link
              className="link-arrow"
              to={`/admin/artworks/new?artist=${idOf(artist.id)}`}
            >
              Add a work by this artist
            </Link>
          </p>
        </section>
      ) : null}

      {artist ? (
        <section className="panel panel-danger">
          <h2>Delete</h2>
          <p>
            {works > 0
              ? `${artist.fields.display_name} has ${works} works. Move or delete them first.`
              : 'This artist has no works. Deleting removes the profile from the site.'}
          </p>
          <Form
            method="post"
            onSubmit={(event) => {
              if (!window.confirm('Delete this artist for good?'))
                event.preventDefault();
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <button
              className="btn btn-danger"
              type="submit"
              disabled={works > 0}
            >
              Delete this artist
            </button>
          </Form>
        </section>
      ) : null}
    </>
  );
}
