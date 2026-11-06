import {useEffect, useRef, useState} from 'react';
import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/admin.artworks.$id';
import {parseEnv} from '~/lib/env.server';
import {
  adminClient,
  failure,
  gid,
  numericId,
  requireAdmin,
} from '~/lib/admin-api.server';
import {
  deleteArtwork,
  getArtwork,
  loadOptions,
  reviewArtwork,
  saveArtwork,
  type ArtworkDetail,
  type Options,
} from '~/lib/catalogue-admin.server';
import {
  PRODUCT_METAFIELDS,
  errorDetail,
  parseFields,
  staffFields,
  parseTags,
  referencedTypes,
  type FieldDef,
} from '~/lib/schema-fields';
import {requireStaff} from '~/lib/staff-session.server';
import {ErrorList, FieldInput} from '~/components/admin/FieldInput';
import {suggestColours} from '~/lib/colour';

const REVIEW_KEYS = new Set(['review_status', 'review_notes', 'submitted_at']);
// Staff choose the artist here; everywhere else it is set for them.
const FIELDS = staffFields(PRODUCT_METAFIELDS as FieldDef[]);
const OTHER_LABELS = {
  title: 'Title',
  price: 'Price',
  compareAtPrice: 'Earlier price',
  status: 'Status',
  images: 'Photographs',
};
const DETAIL_FIELDS = FIELDS.filter((field) => !REVIEW_KEYS.has(field.key));
const REVIEW_FIELDS = FIELDS.filter((field) => REVIEW_KEYS.has(field.key));
const TYPES = Object.fromEntries(
  FIELDS.map((field) => [field.key, field.type]),
);

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export async function loader({context, params, request}: Route.LoaderArgs) {
  requireStaff(request, context.session);
  const admin = adminClient(parseEnv(context.env));
  const isNew = params.id === 'new';
  if (!admin)
    return {
      isNew,
      artwork: null,
      options: {} as Options,
      presetArtist: null,
      error: null,
    };
  try {
    const [artwork, options] = await Promise.all([
      isNew
        ? Promise.resolve(null)
        : getArtwork(admin, gid('Product', params.id)),
      loadOptions(admin, referencedTypes(FIELDS)),
    ]);
    if (!isNew && !artwork) throw new Response(null, {status: 404});
    // "Add a work by this artist" from an artist's page arrives with ?artist=<id>.
    const artistParam = new URL(request.url).searchParams.get('artist');
    const presetArtist =
      isNew && artistParam && /^\d+$/.test(artistParam)
        ? gid('Metaobject', artistParam)
        : null;
    return {isNew, artwork, options, presetArtist, error: null};
  } catch (error) {
    return {
      isNew,
      artwork: null as ArtworkDetail | null,
      options: {} as Options,
      presetArtist: null as string | null,
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
    const id = params.id === 'new' ? undefined : gid('Product', params.id);

    if (intent === 'delete' && id) {
      if (form.get('confirm') !== 'DELETE') {
        return {
          error: {message: 'Type DELETE to confirm', detail: []},
          fieldErrors: {},
        };
      }
      await deleteArtwork(admin, id);
      return redirect('/admin/artworks');
    }

    if (
      intent === 'approved' ||
      intent === 'changes_requested' ||
      intent === 'archived'
    ) {
      if (!id) throw new Response(null, {status: 400});
      await reviewArtwork(
        admin,
        id,
        intent,
        String(form.get('notes') ?? '').trim(),
      );
      return redirect(`/admin/artworks/${params.id}?saved=${intent}`);
    }

    // Save.
    const parsed = parseFields(form, DETAIL_FIELDS);
    const fieldErrors: Record<string, string> = {...parsed.errors};
    const title = String(form.get('title') ?? '').trim();
    const price = String(form.get('price') ?? '')
      .trim()
      .replace(/,/g, '');
    const compareAt = String(form.get('compareAtPrice') ?? '')
      .trim()
      .replace(/,/g, '');
    const status = String(form.get('status') ?? 'DRAFT') as
      'ACTIVE' | 'DRAFT' | 'ARCHIVED';

    if (!title) fieldErrors.title = 'Every work needs a title';
    if (title.length > 255) fieldErrors.title = 'At most 255 characters';
    const onRequest = parsed.values.availability === 'price_on_request';
    if (!/^\d+(\.\d{1,2})?$/.test(price) && !(onRequest && !price)) {
      fieldErrors.price =
        'Enter the price in rupees, digits only, such as 45000';
    }
    if (compareAt && !/^\d+(\.\d{1,2})?$/.test(compareAt))
      fieldErrors.compareAtPrice = 'Digits only';
    if (!['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(status))
      fieldErrors.status = 'Choose a status';

    const newImages = form
      .getAll('images')
      .filter((file): file is File => file instanceof File && file.size > 0);
    const tooBig = newImages.find((file) => file.size > MAX_IMAGE_BYTES);
    if (tooBig) fieldErrors.images = `${tooBig.name} is larger than 20 MB`;
    if (status === 'ACTIVE' && !id && newImages.length === 0) {
      fieldErrors.images = 'A live work needs at least one photograph';
    }

    if (Object.keys(fieldErrors).length) {
      return {
        error: {
          message: 'Some fields need attention',
          detail: errorDetail(fieldErrors, FIELDS, OTHER_LABELS),
        },
        fieldErrors,
      };
    }

    // The artist's name goes in Shopify's vendor field too, so search and the storefront agree.
    const options = await loadOptions(admin, ['phulhaar_artist']);
    const artistName =
      options.phulhaar_artist?.find(
        (option) => option.id === parsed.values.artist,
      )?.label ?? '';

    const savedId = await saveArtwork(admin, {
      id,
      title,
      descriptionHtml: textToHtml(String(form.get('description') ?? '')),
      vendor: artistName,
      productType: String(form.get('productType') ?? '').trim(),
      tags: parseTags(String(form.get('tags') ?? '')),
      status,
      price: price || '0',
      compareAtPrice: compareAt || null,
      values: parsed.values,
      cleared: parsed.cleared,
      types: TYPES,
      newImages,
      removeMedia: form.getAll('removeMedia').map(String),
    });
    return redirect(`/admin/artworks/${numericId(savedId)}?saved=1`);
  } catch (error) {
    return {error: failure(error), fieldErrors: {} as Record<string, string>};
  }
}

/** Plain text with blank lines between paragraphs, made safe as HTML. */
function textToHtml(text: string) {
  const escape = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return text
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((para) => `<p>${escape(para).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/** Back to the plain text the form edits. React escapes it again when it fills the textarea. */
function htmlToText(html: string) {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
  // Strip until nothing is left to strip, so a tag split by another ("<<p>p>") cannot survive.
  for (let previous = ''; previous !== text;) {
    previous = text;
    text = text.replace(/<[^>]*>?/g, '');
  }
  // One pass over every entity, so "&amp;lt;" becomes "&lt;" and not "<".
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]).trim();
}

export default function EditArtwork() {
  const {isNew, artwork, options, presetArtist, error} =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state === 'submitting';
  const fieldErrors = result?.fieldErrors ?? {};
  const values: Record<string, string> =
    artwork?.metafields ?? (presetArtist ? {artist: presetArtist} : {});
  const [previews, setPreviews] = useState<File[]>([]);
  const [suggested, setSuggested] = useState<string[] | null>(null);
  const colourNames = new Map(
    (options.phulhaar_colour ?? []).map((o) => [o.handle ?? '', o.label]),
  );
  const saved =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('saved');

  return (
    <>
      <header className="admin-head">
        <div>
          <p className="eyebrow">
            <Link to="/admin/artworks">Artworks</Link> /{' '}
            {isNew ? 'New' : 'Edit'}
          </p>
          <h1>{isNew ? 'Add an artwork' : artwork?.title}</h1>
        </div>
        {artwork?.onlineStoreUrl || (artwork && artwork.status === 'ACTIVE') ? (
          <a
            className="btn btn-quiet"
            href={`/products/${artwork.handle}`}
            target="_blank"
            rel="noreferrer"
          >
            View on the site
          </a>
        ) : null}
      </header>

      {saved ? <p className="notice">Saved.</p> : null}
      <ErrorList error={result?.error ?? error} />

      <Form
        method="post"
        encType="multipart/form-data"
        className="admin-form"
        // The server checks every field and lists every problem at the top; the browser's own
        // check would stop at the first, often out of sight.
        noValidate
      >
        <input type="hidden" name="intent" value="save" />
        <div className="admin-columns">
          <div>
            <section className="panel">
              <h2>The work</h2>
              <Text
                name="title"
                label="Title"
                required
                defaultValue={artwork?.title}
                error={fieldErrors.title}
                help="As the artist names it. Shown in italics on the label."
              />
              <div className="field">
                <label htmlFor="description">About the work</label>
                <textarea
                  id="description"
                  name="description"
                  rows={6}
                  defaultValue={htmlToText(artwork?.descriptionHtml ?? '')}
                />
                <small className="field-help">
                  Shown under the label. Leave a blank line between paragraphs.
                  Search reads every word.
                </small>
              </div>
              <Text
                name="tags"
                label="Tags"
                defaultValue={artwork?.tags.join(', ')}
                help="Anything a buyer might search for: Madhubani, peacock, wedding, blue. Separate with commas."
              />
              <Text
                name="productType"
                label="Type"
                defaultValue={artwork?.productType}
                help="A single word Shopify groups works by, such as Painting."
              />
            </section>

            <section className="panel">
              <h2>Photographs</h2>
              {artwork?.media.length || artwork?.processingMedia ? (
                <div className="media-grid">
                  {artwork.media.map((media) => (
                    <label key={media.id} className="media-item">
                      <img src={media.url} alt={media.alt ?? ''} />
                      <span>
                        <input
                          type="checkbox"
                          name="removeMedia"
                          value={media.id}
                        />{' '}
                        Remove
                      </span>
                    </label>
                  ))}
                  {Array.from({length: artwork.processingMedia}, (_, i) => (
                    <div
                      key={`processing-${i}`}
                      className="media-item media-processing"
                      role="status"
                    >
                      <span>Shopify is still processing this photograph.</span>
                      <a href="?">Refresh</a>
                    </div>
                  ))}
                </div>
              ) : null}
              <div
                className={`field${fieldErrors.images ? ' field-error' : ''}`}
              >
                <label htmlFor="images">Add photographs</label>
                <input
                  id="images"
                  name="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const files = [...(event.target.files ?? [])];
                    setPreviews(files);
                  }}
                />
                {previews.length ? (
                  <div className="media-grid">
                    {previews.map((file, index) => (
                      <FilePreview
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        file={file}
                        onDrawn={
                          index === 0
                            ? (canvas) => setSuggested(applyColours(canvas))
                            : undefined
                        }
                      />
                    ))}
                  </div>
                ) : null}
                {suggested?.length ? (
                  <p className="notice" role="status">
                    Colours suggested from the first photograph:{' '}
                    {suggested
                      .map((handle) => colourNames.get(handle) ?? handle)
                      .join(', ')}
                    . Check them under Dominant colours before saving.
                  </p>
                ) : null}
                <small
                  className={fieldErrors.images ? 'error-text' : 'field-help'}
                >
                  {fieldErrors.images ??
                    'Any size. The first is the main image: the whole work, straight on, in daylight.'}
                </small>
              </div>
            </section>

            <section className="panel">
              <h2>Details</h2>
              <div className="field-grid">
                {DETAIL_FIELDS.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    options={options}
                    error={fieldErrors[field.key]}
                  />
                ))}
              </div>
            </section>
          </div>

          <div>
            <section className="panel panel-sticky">
              <h2>Price and status</h2>
              <Text
                name="price"
                label="Price (₹)"
                required
                inputMode="decimal"
                defaultValue={
                  artwork?.variant?.price
                    ? String(Number(artwork.variant.price))
                    : ''
                }
                error={fieldErrors.price}
                help="What the buyer pays, in rupees."
              />
              <Text
                name="compareAtPrice"
                label="Earlier price (₹)"
                inputMode="decimal"
                defaultValue={
                  artwork?.variant?.compareAtPrice
                    ? String(Number(artwork.variant.compareAtPrice))
                    : ''
                }
                error={fieldErrors.compareAtPrice}
                help="Optional. Only if the price has really come down."
              />
              <div className="field">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  defaultValue={artwork?.status ?? 'DRAFT'}
                >
                  <option value="DRAFT">Draft — hidden</option>
                  <option value="ACTIVE">Live — on the site</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              {artwork?.variant ? (
                <p className="muted" style={{fontSize: '1rem'}}>
                  In stock: {artwork.variant.inventoryQuantity ?? '—'}. Set
                  Availability to Sold to take an original off sale.
                </p>
              ) : null}
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy
                  ? 'Saving'
                  : isNew
                    ? 'Create the artwork'
                    : 'Save changes'}
              </button>
            </section>
          </div>
        </div>
      </Form>

      {!isNew && artwork ? (
        <div className="admin-columns">
          <section className="panel">
            <h2>Review</h2>
            <div className="field-grid">
              {REVIEW_FIELDS.map((field) => (
                <FieldInput
                  key={field.key}
                  field={{...field, editor: 'computed'}}
                  value={values[field.key]}
                  options={options}
                />
              ))}
            </div>
            <Form method="post">
              <div className="field">
                <label htmlFor="notes">Note to the artist</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="What to change, if anything"
                />
              </div>
              <div className="admin-actions">
                <button
                  className="btn"
                  name="intent"
                  value="approved"
                  type="submit"
                >
                  Approve and publish
                </button>
                <button
                  className="btn btn-quiet"
                  name="intent"
                  value="changes_requested"
                  type="submit"
                >
                  Ask for changes
                </button>
                <button
                  className="btn btn-quiet"
                  name="intent"
                  value="archived"
                  type="submit"
                >
                  Archive
                </button>
              </div>
            </Form>
          </section>

          <section className="panel panel-danger">
            <h2>Delete</h2>
            <p>
              Deleting removes the work, its photographs and its history from
              Shopify. Archive it instead if it might come back.
            </p>
            <Form
              method="post"
              onSubmit={(event) => {
                if (!window.confirm(`Delete “${artwork.title}” for good?`))
                  event.preventDefault();
              }}
            >
              <input type="hidden" name="intent" value="delete" />
              <div className="field">
                <label htmlFor="confirm">Type DELETE to confirm</label>
                <input id="confirm" name="confirm" autoComplete="off" />
              </div>
              <button className="btn btn-danger" type="submit">
                Delete this artwork
              </button>
            </Form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Text({
  name,
  label,
  help,
  error,
  required,
  defaultValue,
  inputMode,
}: {
  name: string;
  label: string;
  help?: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  inputMode?: 'decimal';
}) {
  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {required ? <span className="req"> *</span> : null}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        required={required}
        inputMode={inputMode}
      />
      <small className={error ? 'error-text' : 'field-help'}>
        {error ?? help}
      </small>
    </div>
  );
}

/**
 * A chosen photograph, drawn onto a canvas. Nothing from the file is ever put into the page as a
 * URL or markup, so there is nothing to escape.
 */
/**
 * Reads the first photograph's colours and ticks them in the Dominant colours picker, unless
 * staff have already chosen colours by hand. Returns what it suggested, or null if it did not.
 */
function applyColours(canvas: HTMLCanvasElement): string[] | null {
  const context = canvas.getContext('2d', {willReadFrequently: true});
  if (!context || !canvas.width || !canvas.height) return null;
  const {data} = context.getImageData(0, 0, canvas.width, canvas.height);
  const handles = suggestColours(data, canvas.width, canvas.height);
  const fieldset = document.querySelector<HTMLFieldSetElement>(
    'fieldset[data-field="colours"]',
  );
  if (!fieldset || !handles.length) return null;
  if (fieldset.dataset.touched === 'true') return null;
  const boxes = [
    ...fieldset.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'),
  ];
  if (!boxes.some((box) => handles.includes(box.dataset.handle ?? '')))
    return null;
  // Colours already saved on the work are kept, unless an earlier suggestion put them there.
  if (fieldset.dataset.suggested !== 'true' && boxes.some((box) => box.checked))
    return null;
  for (const box of boxes)
    box.checked = handles.includes(box.dataset.handle ?? '');
  fieldset.dataset.suggested = 'true';
  return handles;
}

function FilePreview({
  file,
  onDrawn,
}: {
  file: File;
  onDrawn?: (canvas: HTMLCanvasElement) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // The latest callback, without redrawing the preview every time the parent renders.
  const drawn = useRef(onDrawn);
  drawn.current = onDrawn;
  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file)
      .then((bitmap) => {
        const element = canvas.current;
        if (cancelled || !element) return bitmap.close();
        const scale = Math.min(1, 320 / Math.max(bitmap.width, bitmap.height));
        element.width = Math.round(bitmap.width * scale);
        element.height = Math.round(bitmap.height * scale);
        element
          .getContext('2d')
          ?.drawImage(bitmap, 0, 0, element.width, element.height);
        bitmap.close();
        drawn.current?.(element);
      })
      .catch(() => {
        // Not an image the browser can read; the upload itself will say so.
      });
    return () => {
      cancelled = true;
    };
  }, [file]);
  return <canvas ref={canvas} className="media-new" aria-label={file.name} />;
}
