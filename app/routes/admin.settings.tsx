import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/admin.settings';
import {parseEnv} from '~/lib/env.server';
import {adminClient, failure, requireAdmin} from '~/lib/admin-api.server';
import {
  getMetaobjectByHandle,
  upsertMetaobject,
  type MetaobjectDetail,
} from '~/lib/catalogue-admin.server';
import {
  GALLERY_METAOBJECT,
  parseFields,
  type FieldDef,
} from '~/lib/schema-fields';
import {requireStaff} from '~/lib/staff-session.server';
import {ErrorList, FieldInput} from '~/components/admin/FieldInput';

const FIELDS = GALLERY_METAOBJECT.fields as FieldDef[];

export async function loader({context, request}: Route.LoaderArgs) {
  requireStaff(request, context.session);
  const admin = adminClient(parseEnv(context.env));
  if (!admin) return {settings: null, error: null};
  try {
    return {
      settings: await getMetaobjectByHandle(
        admin,
        GALLERY_METAOBJECT.type,
        'settings',
      ),
      error: null,
    };
  } catch (error) {
    return {settings: null as MetaobjectDetail | null, error: failure(error)};
  }
}

export async function action({context, request}: Route.ActionArgs) {
  requireStaff(request, context.session);
  const form = await request.formData();
  try {
    const admin = requireAdmin(parseEnv(context.env));
    const parsed = parseFields(form, FIELDS);
    if (Object.keys(parsed.errors).length) {
      return {
        error: {message: 'Some fields need attention', detail: []},
        fieldErrors: parsed.errors,
      };
    }
    await upsertMetaobject(admin, {
      type: GALLERY_METAOBJECT.type,
      handle: 'settings',
      values: {
        ...Object.fromEntries(parsed.cleared.map((key) => [key, ''])),
        ...parsed.values,
      },
    });
    return redirect('/admin/settings?saved=1');
  } catch (error) {
    return {error: failure(error), fieldErrors: {} as Record<string, string>};
  }
}

export default function Settings() {
  const {settings, error} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state === 'submitting';
  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">The gallery</p>
          <h1>Gallery settings</h1>
        </div>
      </header>
      <ErrorList error={result?.error ?? error} />
      <p className="muted">
        Shown on the Visit page and in the bar at the top of the site. Anything
        left empty is simply not shown.
      </p>
      <Form method="post">
        <section className="panel">
          <div className="field-grid">
            {FIELDS.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={settings?.fields[field.key]}
                options={{}}
                error={result?.fieldErrors?.[field.key]}
              />
            ))}
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Saving' : 'Save settings'}
          </button>
        </section>
      </Form>
    </>
  );
}
