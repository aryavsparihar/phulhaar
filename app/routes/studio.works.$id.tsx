import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/studio.works.$id';
import {parseEnv} from '~/lib/env.server';
import {failure, gid, requireAdmin} from '~/lib/admin-api.server';
import {ownerOf, setTags} from '~/lib/catalogue-admin.server';
import {currentArtist} from '~/lib/artist-session.server';
import {parseTags} from '~/lib/schema-fields';

export const meta: Route.MetaFunction = () => [
  {title: 'Tags — Your studio — Phulhaar Gallery'},
  {name: 'robots', content: 'noindex'},
];

/** The work, only if it is this artist's: checked against PJK's Artist ID on every request. */
async function ownWork(context: Route.LoaderArgs['context'], id: string) {
  const artist = currentArtist(context.session);
  if (!artist) throw redirect('/studio/sign-in');
  const admin = requireAdmin(parseEnv(context.env));
  const work = await ownerOf(admin, gid('Product', id));
  if (!work || work.artistId !== artist.artistId)
    throw new Response(null, {status: 404});
  return {admin, work};
}

export async function loader({context, params}: Route.LoaderArgs) {
  try {
    const {work} = await ownWork(context, params.id);
    return {title: work.title, tags: work.tags, error: null};
  } catch (error) {
    if (error instanceof Response) throw error;
    return {title: '', tags: [] as string[], error: failure(error)};
  }
}

export async function action({context, params, request}: Route.ActionArgs) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin)
    throw new Response(null, {status: 403});
  try {
    const {admin} = await ownWork(context, params.id);
    const tags = parseTags(
      String((await request.formData()).get('tags') ?? ''),
    );
    await setTags(admin, gid('Product', params.id), tags);
    return redirect('/studio?tags=saved');
  } catch (error) {
    if (error instanceof Response) throw error;
    return {error: failure(error)};
  }
}

export default function WorkTags() {
  const {title, tags, error} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state === 'submitting';
  const problem = result?.error ?? error;
  return (
    <div className="wrap studio">
      <p className="eyebrow">
        <Link to="/studio">Your studio</Link> / Tags
      </p>
      <h1>{title || 'Tags'}</h1>
      <hr className="gold-rule" style={{marginBottom: '1.5rem'}} />
      {problem ? (
        <p className="notice notice-error" role="alert">
          {problem.message}
        </p>
      ) : null}
      <Form method="post" className="prose">
        <div className="field">
          <label htmlFor="tags">Tags</label>
          <textarea
            id="tags"
            name="tags"
            rows={4}
            defaultValue={tags.join(', ')}
          />
          <small className="field-help">
            The words a buyer might search for: the tradition, what is in the
            work, its colours, the festival or story. Separate them with commas.
            Search reads these first.
          </small>
        </div>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Saving' : 'Save tags'}
        </button>
      </Form>
    </div>
  );
}
