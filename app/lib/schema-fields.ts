/**
 * The admin forms are drawn from the store schema in scripts/shopify/definitions.ts, so every
 * field the store has appears in the admin with its own name, help text and validation, and a
 * field added to the schema later appears without anyone touching a form.
 *
 * This file turns a definition into a form control, and a submitted form back into the values
 * Shopify stores. It is shared by the server (parsing, validating) and the browser (rendering).
 */
import {
  ARTIST_METAOBJECT,
  GALLERY_METAOBJECT,
  PRODUCT_METAFIELDS,
  type ProductMetafield,
} from '../../scripts/shopify/definitions';
import {orientationOf, sizeBandOf} from '~/lib/artwork';

export {ARTIST_METAOBJECT, GALLERY_METAOBJECT, PRODUCT_METAFIELDS};

export interface FieldDef {
  key: string;
  name: string;
  description: string;
  type: string;
  required?: boolean;
  validations?: Array<{name: string; value: string}>;
  editor?: ProductMetafield['editor'];
}

export function choicesOf(field: FieldDef): string[] | null {
  const raw = field.validations?.find((v) => v.name === 'choices')?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return null;
  }
}

/** The metaobject type a reference field points at, such as phulhaar_medium. */
export function referenceTypeOf(field: FieldDef): string | null {
  return (
    field.validations?.find((v) => v.name === 'metaobject_definition_type')
      ?.value ?? null
  );
}

export function minOf(field: FieldDef): number | null {
  const raw = field.validations?.find((v) => v.name === 'min')?.value;
  return raw === undefined ? null : Number(raw);
}

/** Every metaobject type the given fields refer to, so a page can load their options at once. */
export function referencedTypes(fields: FieldDef[]): string[] {
  return [
    ...new Set(fields.map(referenceTypeOf).filter((t): t is string => !!t)),
  ];
}

/** Words for a stored choice: "limited_edition" → "Limited edition". */
export function labelOf(choice: string) {
  const words = choice.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Fields computed from others or owned by PJK are shown, never edited by hand. */
export function isEditable(field: FieldDef) {
  return field.editor !== 'computed' && field.editor !== 'pjk';
}

/**
 * The fields as gallery staff edit them in /admin. The artist is owned by PJK for an artist's own
 * submissions (the studio sets it from the signed-in Artist ID), but staff adding a work must
 * choose who made it, so here it is an ordinary required choice.
 */
export function staffFields(fields: FieldDef[]): FieldDef[] {
  return fields.map((field) =>
    field.key === 'artist' ? {...field, editor: 'staff'} : field,
  );
}

/** Field errors as lines for the summary at the top of a form: "Artist: Artist is required". */
export function errorDetail(
  errors: Record<string, string>,
  fields: FieldDef[],
  extraLabels: Record<string, string> = {},
): string[] {
  const labels = new Map<string, string>([
    ...fields.map((field) => [field.key, field.name] as [string, string]),
    ...Object.entries(extraLabels),
  ]);
  return Object.entries(errors).map(([key, message]) => {
    const label = labels.get(key) ?? labelOf(key);
    return message.toLowerCase().startsWith(label.toLowerCase())
      ? message
      : `${label}: ${message}`;
  });
}

export const FIELD_PREFIX = 'f.';

export interface ParsedFields {
  values: Record<string, string>;
  /** Keys submitted empty, which an update should clear. */
  cleared: string[];
  errors: Record<string, string>;
}

/**
 * Read a submitted form against the definitions: lists into JSON arrays, booleans into
 * "true"/"false", everything checked for required, choices, minimums and patterns.
 */
/**
 * The regex validations in the definitions, written out rather than built with `new RegExp`, so
 * nothing ever compiles a pattern at run time. Shopify enforces every definition's validations
 * when it saves, so a pattern missing here is still checked there; this only gives the editor a
 * friendlier message first.
 */
export const PATTERNS: Record<string, RegExp> = {
  '^(AT|PT)\\d{6,}$': /^(AT|PT)\d{6,}$/,
};

export function parseFields(form: FormData, fields: FieldDef[]): ParsedFields {
  const values: Record<string, string> = {};
  const cleared: string[] = [];
  const errors: Record<string, string> = {};

  for (const field of fields) {
    if (
      !isEditable(field) ||
      field.type === 'file_reference' ||
      field.type === 'date_time'
    ) {
      continue;
    }
    const name = FIELD_PREFIX + field.key;
    let value = '';

    if (field.type === 'boolean') {
      const raw = form.get(name);
      value = raw === 'true' ? 'true' : raw === 'false' ? 'false' : '';
    } else if (field.type.startsWith('list.')) {
      const items =
        field.type === 'list.metaobject_reference'
          ? form.getAll(name).map(String)
          : String(form.get(name) ?? '').split('\n');
      const clean = items.map((item) => item.trim()).filter(Boolean);
      value = clean.length ? JSON.stringify(clean) : '';
      if (field.type === 'list.url') {
        const bad = clean.find((url) => !/^https?:\/\/\S+$/.test(url));
        if (bad) errors[field.key] = `${bad} is not a web address`;
      }
    } else {
      value = String(form.get(name) ?? '').trim();
    }

    if (!value) {
      if (field.required) errors[field.key] = `${field.name} is required`;
      cleared.push(field.key);
      continue;
    }

    const choices = choicesOf(field);
    if (choices && !choices.includes(value)) {
      errors[field.key] = `Choose one of: ${choices.map(labelOf).join(', ')}`;
    }
    if (field.type === 'number_integer' || field.type === 'number_decimal') {
      const number = Number(value);
      const min = minOf(field);
      if (!Number.isFinite(number)) errors[field.key] = 'Enter a number';
      else if (field.type === 'number_integer' && !Number.isInteger(number))
        errors[field.key] = 'Enter a whole number';
      else if (min !== null && number < min)
        errors[field.key] = `At least ${min}`;
    }
    if (field.type === 'url' && !/^https?:\/\/\S+$/.test(value)) {
      errors[field.key] = 'Enter a full web address, starting https://';
    }
    const pattern = field.validations?.find((v) => v.name === 'regex')?.value;
    const check = pattern ? PATTERNS[pattern] : undefined;
    if (check && !check.test(value)) {
      errors[field.key] = `${field.name} is not in the expected form`;
    }

    values[field.key] = value;
  }

  return {values, cleared, errors};
}

/** Orientation and size band follow from the measurements, so they are never typed. */
export function computeArtworkFields(values: Record<string, string>) {
  const heightCm = Number(values.height_cm);
  const widthCm = Number(values.width_cm);
  const depthCm = values.depth_cm ? Number(values.depth_cm) : undefined;
  if (!(heightCm > 0) || !(widthCm > 0)) return {};
  const dimensions = {
    heightCm,
    widthCm,
    depthCm: depthCm && depthCm > 0 ? depthCm : undefined,
  };
  return {
    orientation: orientationOf(dimensions),
    size_band: sizeBandOf(dimensions),
  } as Record<string, string>;
}

/**
 * The review status a staff save leaves: whatever the work already has, otherwise approved for a
 * live work and draft for a draft. Staff are the reviewers, so their own live work needs no
 * second review; an archived work without one is left without one.
 */
export function reviewStatusFor(
  status: string,
  current?: string | null,
): string | null {
  if (current) return current;
  if (status === 'ACTIVE') return 'approved';
  if (status === 'DRAFT') return 'draft';
  return null;
}

/** Tags as people type them: commas or new lines, trimmed, de-duplicated, at most 40 characters. */
export function parseTags(raw: string): string[] {
  const seen = new Map<string, string>();
  for (const tag of raw.split(/[,\n]/)) {
    const clean = tag.trim().replace(/\s+/g, ' ').slice(0, 40);
    if (clean && !seen.has(clean.toLowerCase()))
      seen.set(clean.toLowerCase(), clean);
  }
  return [...seen.values()].slice(0, 50);
}
