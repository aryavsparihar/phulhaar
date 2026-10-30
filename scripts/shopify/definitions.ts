/**
 * The store's schema, as data.
 *
 * Shopify's admin lets you click metafields into existence, and a store built that way has no
 * record of why any field is the type it is, no way to rebuild it, and no way to tell a
 * development store from production. So every metafield definition, metaobject definition and
 * taxonomy entry Phulhaar needs is declared here and applied by `scripts/shopify-setup.ts`, which
 * is idempotent: running it against a fresh store creates everything, and running it again changes
 * only what has drifted.
 *
 * Two constraints shape most of the choices below.
 *
 * Shopify's free Search & Discovery app can only build a storefront filter from a metafield whose
 * type is single line text, a list of single line text, decimal, integer, true/false, a metaobject
 * reference or a list of metaobject references -- and only from a value actually stored on the
 * product. Anything a buyer filters on therefore has one of those types, and anything derived
 * (orientation, size band) is computed on the way in rather than at render time.
 *
 * A store may have up to 25 filters in all, which is fewer than the facets in the brief, so
 * docs/DATA-MODEL.md records which ones are filters and which are shown but not filtered.
 *
 * Taxonomies are metaobjects rather than plain text because a metaobject carries a display name
 * separately from its handle. That lets "Textile and fibre" read properly on the page while the
 * handle stays `textile-and-fibre`, lets a tradition gain a description later without touching
 * every artwork, and is the only way Search & Discovery will render a colour swatch filter.
 */

/** Everything Phulhaar adds to products lives under one namespace, so nothing collides. */
export const NAMESPACE = 'phulhaar';

/** The Admin API version this script is written against. */
export const ADMIN_API_VERSION = '2026-10';

// ---------------------------------------------------------------------------
// Taxonomies
// ---------------------------------------------------------------------------

export interface TaxonomyEntry {
  handle: string;
  name: string;
}

export interface TaxonomyDefinition {
  /** The metaobject type, which is also what a metafield references. */
  type: string;
  name: string;
  description: string;
  /** Seeded on first run. Staff may add more in the admin; the script never deletes. */
  entries: TaxonomyEntry[];
  /** A colour swatch, for the colour taxonomy only. */
  withColour?: boolean;
}

/** Turn a display name into a handle, the same way for every taxonomy. */
function handleFor(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function entries(...names: string[]): TaxonomyEntry[] {
  return names.map((name) => ({handle: handleFor(name), name}));
}

export const TAXONOMIES: TaxonomyDefinition[] = [
  {
    type: 'phulhaar_category',
    name: 'Artwork category',
    description: 'What kind of work it is. Every artwork has exactly one.',
    entries: entries(
      'Painting',
      'Drawing',
      'Photography',
      'Sculpture',
      'Printmaking',
      'Digital',
      'Mixed media',
      'Textile and fibre',
      'Craft',
    ),
  },
  {
    type: 'phulhaar_medium',
    name: 'Medium',
    description: 'What the work is made with. A work may have several.',
    entries: entries(
      'Oil',
      'Acrylic',
      'Watercolour',
      'Gouache',
      'Ink',
      'Charcoal',
      'Pastel',
      'Tempera',
      'Natural pigments',
      'Gold leaf',
      'Graphite',
      'Clay',
      'Stone',
      'Bronze',
      'Wood',
      'Thread',
      'Dye',
    ),
  },
  {
    type: 'phulhaar_surface',
    name: 'Surface or support',
    description: 'What the work is made on. Every artwork has one.',
    entries: entries(
      'Canvas',
      'Paper',
      'Handmade paper',
      'Board',
      'Wood',
      'Cloth',
      'Silk',
      'Cotton',
      'Metal',
      'Stone',
      'Terracotta',
      'Wall',
    ),
  },
  {
    type: 'phulhaar_style',
    name: 'Style',
    description: 'How the work reads. A work may have several.',
    entries: entries(
      'Abstract',
      'Figurative',
      'Contemporary',
      'Modern',
      'Folk',
      'Realist',
      'Surreal',
      'Minimal',
      'Narrative',
      'Decorative',
    ),
  },
  {
    type: 'phulhaar_tradition',
    name: 'Indian tradition',
    description:
      'The named tradition a work belongs to, where it belongs to one. This is the taxonomy ' +
      'Phulhaar exists to show properly, so an entry is added only when an artist and staff ' +
      'agree the work genuinely sits in it.',
    entries: entries(
      'Madhubani',
      'Pichwai',
      'Gond',
      'Warli',
      'Pattachitra',
      'Kalamkari',
      'Tanjore',
      'Kangra',
      'Phad',
      'Kalighat',
      'Mithila',
      'Cheriyal',
      'Bhil',
      'Saura',
      'Kerala mural',
      'Miniature',
    ),
  },
  {
    type: 'phulhaar_subject',
    name: 'Subject',
    description: 'What the work is of. A work may have several.',
    entries: entries(
      'Nature',
      'Devotional',
      'Portrait',
      'Landscape',
      'Figures',
      'Animals',
      'Birds',
      'Flowers',
      'Village life',
      'Festival',
      'Mythology',
      'Architecture',
      'Still life',
      'Abstract forms',
    ),
  },
  {
    type: 'phulhaar_colour',
    name: 'Dominant colour',
    description:
      'The few colours a work actually reads as, extracted from its main image when it is ' +
      'uploaded. A buyer who is furnishing a room filters by this more often than by style.',
    // Search & Discovery renders a swatch filter only from a metaobject with a colour field and a
    // single-value text field for its name, which is why this taxonomy has the extra field.
    withColour: true,
    entries: [
      {handle: 'red', name: 'Red'},
      {handle: 'pink', name: 'Pink'},
      {handle: 'orange', name: 'Orange'},
      {handle: 'yellow', name: 'Yellow'},
      {handle: 'gold', name: 'Gold'},
      {handle: 'green', name: 'Green'},
      {handle: 'blue', name: 'Blue'},
      {handle: 'indigo', name: 'Indigo'},
      {handle: 'violet', name: 'Violet'},
      {handle: 'brown', name: 'Brown'},
      {handle: 'ochre', name: 'Ochre'},
      {handle: 'black', name: 'Black'},
      {handle: 'white', name: 'White'},
      {handle: 'grey', name: 'Grey'},
      {handle: 'multicoloured', name: 'Multicoloured'},
    ],
  },
  {
    type: 'phulhaar_state',
    name: 'State or union territory',
    description:
      'Where a work ships from, and how the artist directory is grouped. Kept as a taxonomy so ' +
      'that "West Bengal" is spelled one way across the whole catalogue.',
    entries: entries(
      'Andhra Pradesh',
      'Arunachal Pradesh',
      'Assam',
      'Bihar',
      'Chhattisgarh',
      'Goa',
      'Gujarat',
      'Haryana',
      'Himachal Pradesh',
      'Jharkhand',
      'Karnataka',
      'Kerala',
      'Madhya Pradesh',
      'Maharashtra',
      'Manipur',
      'Meghalaya',
      'Mizoram',
      'Nagaland',
      'Odisha',
      'Punjab',
      'Rajasthan',
      'Sikkim',
      'Tamil Nadu',
      'Telangana',
      'Tripura',
      'Uttar Pradesh',
      'Uttarakhand',
      'West Bengal',
      'Andaman and Nicobar Islands',
      'Chandigarh',
      'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi',
      'Jammu and Kashmir',
      'Ladakh',
      'Lakshadweep',
      'Puducherry',
    ),
  },
];

// ---------------------------------------------------------------------------
// The artist metaobject, filled from PJK
// ---------------------------------------------------------------------------

export interface FieldDefinition {
  key: string;
  name: string;
  description: string;
  type: string;
  required?: boolean;
  validations?: Array<{name: string; value: string}>;
}

export const ARTIST_METAOBJECT = {
  type: 'phulhaar_artist',
  name: 'Artist',
  description:
    'An artist, as Phulhaar is allowed to show them. Every field here comes from the public ' +
    'profile PJK staff approved, and arrives through the lifecycle webhook rather than being ' +
    'typed in. Nothing identifying beyond a display name and a city is ever stored: no email ' +
    'address, no PAN, no Aadhaar, no bank details.',
  fields: [
    {
      key: 'artist_id',
      name: 'Artist ID',
      description: "The ID PJK issued, like AT000123. The join between the two systems.",
      type: 'single_line_text_field',
      required: true,
      validations: [{name: 'regex', value: '^(AT|PT)\\d{6,}$'}],
    },
    {
      key: 'display_name',
      name: 'Display name',
      description: 'The name the artist wants shown, which is not necessarily their legal name.',
      type: 'single_line_text_field',
      required: true,
    },
    {
      key: 'biography',
      name: 'Biography',
      description: 'The approved biography.',
      type: 'multi_line_text_field',
    },
    {
      key: 'statement',
      name: 'Artist statement',
      description: "The artist's own statement about their work.",
      type: 'multi_line_text_field',
    },
    {
      key: 'portrait',
      name: 'Portrait',
      description: 'The approved portrait.',
      type: 'file_reference',
      validations: [{name: 'file_type_options', value: '["Image"]'}],
    },
    {
      key: 'city',
      name: 'City',
      description: 'Where the artist works.',
      type: 'single_line_text_field',
    },
    {
      key: 'state',
      name: 'State',
      description: 'Used to group the artist directory.',
      type: 'metaobject_reference',
      validations: [{name: 'metaobject_definition_type', value: 'phulhaar_state'}],
    },
    {
      key: 'mediums',
      name: 'Mediums',
      description: 'What the artist works in, for their profile page.',
      type: 'list.metaobject_reference',
      validations: [{name: 'metaobject_definition_type', value: 'phulhaar_medium'}],
    },
    {
      key: 'traditions',
      name: 'Traditions',
      description: 'The traditions the artist works in.',
      type: 'list.metaobject_reference',
      validations: [{name: 'metaobject_definition_type', value: 'phulhaar_tradition'}],
    },
    {
      key: 'exhibitions',
      name: 'Exhibitions and awards',
      description: 'One per line, as approved.',
      type: 'multi_line_text_field',
    },
    {
      key: 'links',
      name: 'Links',
      description: "The artist's own site and public profiles, as approved.",
      type: 'list.url',
    },
    {
      key: 'pjk_verified',
      name: 'PJK verified',
      description:
        'True once PJK has approved the artist after its identity checks. What the checks were ' +
        'and what they found stays in PJK; only this flag crosses over.',
      type: 'boolean',
    },
    {
      key: 'standing',
      name: 'Standing',
      description:
        'active or suspended, as PJK last reported. A suspended artist\'s works are hidden ' +
        'rather than deleted.',
      type: 'single_line_text_field',
      validations: [{name: 'choices', value: '["active","suspended"]'}],
    },
    {
      key: 'profile_version',
      name: 'Profile version',
      description:
        'The version of the approved profile this record was built from, so a webhook that ' +
        'arrives out of order does not overwrite newer data with older.',
      type: 'number_integer',
    },
  ] satisfies FieldDefinition[],
};

// ---------------------------------------------------------------------------
// Product metafields: the artwork itself
// ---------------------------------------------------------------------------

/** Who may change a field, which docs/DATA-MODEL.md turns into a table. */
export type Editor = 'artist' | 'staff' | 'computed' | 'pjk';

export interface ProductMetafield extends FieldDefinition {
  editor: Editor;
  /** True if this is meant to become a storefront filter in Search & Discovery. */
  filter?: boolean;
}

const reference = (type: string) => [{name: 'metaobject_definition_type', value: type}];

export const PRODUCT_METAFIELDS: ProductMetafield[] = [
  // --- Basics -------------------------------------------------------------
  {
    key: 'artist',
    name: 'Artist',
    description: 'The artist who made the work. Set when the work is created and never changed.',
    type: 'metaobject_reference',
    required: true,
    validations: reference('phulhaar_artist'),
    editor: 'pjk',
    filter: true,
  },
  {
    key: 'year',
    name: 'Year',
    description: 'The year the work was finished. Left empty for an undated work.',
    type: 'number_integer',
    validations: [{name: 'min', value: '1800'}],
    editor: 'artist',
  },
  {
    key: 'category',
    name: 'Category',
    description: 'What kind of work it is. Drives the category landing pages.',
    type: 'metaobject_reference',
    required: true,
    validations: reference('phulhaar_category'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'mediums',
    name: 'Mediums',
    description: 'What the work is made with.',
    type: 'list.metaobject_reference',
    validations: reference('phulhaar_medium'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'surface',
    name: 'Surface or support',
    description: 'What the work is made on.',
    type: 'metaobject_reference',
    validations: reference('phulhaar_surface'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'styles',
    name: 'Styles',
    description: 'How the work reads.',
    type: 'list.metaobject_reference',
    validations: reference('phulhaar_style'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'traditions',
    name: 'Indian traditions',
    description: 'The named tradition or traditions the work belongs to.',
    type: 'list.metaobject_reference',
    validations: reference('phulhaar_tradition'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'subjects',
    name: 'Subjects',
    description: 'What the work is of.',
    type: 'list.metaobject_reference',
    validations: reference('phulhaar_subject'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'artist_note',
    name: "Artist's note",
    description:
      "The artist's own words about this particular work, shown under the description in their " +
      'voice rather than the gallery\'s.',
    type: 'multi_line_text_field',
    editor: 'artist',
  },

  // --- Size ---------------------------------------------------------------
  {
    key: 'height_cm',
    name: 'Height (cm)',
    description: 'Centimetres. Inches are worked out from this for display.',
    type: 'number_decimal',
    required: true,
    validations: [{name: 'min', value: '0.1'}],
    editor: 'artist',
  },
  {
    key: 'width_cm',
    name: 'Width (cm)',
    description: 'Centimetres.',
    type: 'number_decimal',
    required: true,
    validations: [{name: 'min', value: '0.1'}],
    editor: 'artist',
  },
  {
    key: 'depth_cm',
    name: 'Depth (cm)',
    description: 'Centimetres. Empty for anything flat.',
    type: 'number_decimal',
    validations: [{name: 'min', value: '0.1'}],
    editor: 'artist',
  },
  {
    key: 'orientation',
    name: 'Orientation',
    description:
      'portrait, landscape or square, worked out from the height and width. Not editable: an ' +
      'artist who sets this by hand will eventually contradict the measurements.',
    type: 'single_line_text_field',
    validations: [{name: 'choices', value: '["portrait","landscape","square"]'}],
    editor: 'computed',
    filter: true,
  },
  {
    key: 'size_band',
    name: 'Size band',
    description:
      'small, medium, large or oversized, from the longest side. Stored rather than calculated ' +
      'because a filter can only read a stored value.',
    type: 'single_line_text_field',
    validations: [{name: 'choices', value: '["small","medium","large","oversized"]'}],
    editor: 'computed',
    filter: true,
  },

  // --- Edition ------------------------------------------------------------
  {
    key: 'rarity',
    name: 'Rarity',
    description: 'Whether the work is unique, one of a numbered edition, or an open edition.',
    type: 'single_line_text_field',
    required: true,
    validations: [{name: 'choices', value: '["original","limited_edition","open_edition"]'}],
    editor: 'artist',
    filter: true,
  },
  {
    key: 'edition_size',
    name: 'Edition size',
    description: 'How many exist. Only for a limited edition.',
    type: 'number_integer',
    validations: [{name: 'min', value: '2'}],
    editor: 'artist',
  },
  {
    key: 'edition_number',
    name: 'Edition number',
    description: 'Which one this is. Only for a limited edition.',
    type: 'number_integer',
    validations: [{name: 'min', value: '1'}],
    editor: 'artist',
  },
  {
    key: 'signed',
    name: 'Signed',
    description: 'Whether the artist has signed the work.',
    type: 'boolean',
    editor: 'artist',
    filter: true,
  },
  {
    key: 'has_certificate',
    name: 'Certificate of authenticity',
    description: 'Whether the work ships with a certificate.',
    type: 'boolean',
    editor: 'artist',
  },

  // --- Presentation -------------------------------------------------------
  {
    key: 'framed',
    name: 'Framed',
    description: 'Whether the work arrives framed.',
    type: 'boolean',
    editor: 'artist',
    filter: true,
  },
  {
    key: 'frame_details',
    name: 'Frame details',
    description: 'What the frame is, where there is one.',
    type: 'single_line_text_field',
    editor: 'artist',
  },
  {
    key: 'ready_to_hang',
    name: 'Ready to hang',
    description: 'Whether a buyer can put it on a wall as it arrives.',
    type: 'boolean',
    editor: 'artist',
    filter: true,
  },
  {
    key: 'ships_as',
    name: 'Ships as',
    description:
      'rolled, stretched or crated. A buyer needs this before buying, because a rolled canvas ' +
      'has to be stretched at the other end.',
    type: 'single_line_text_field',
    validations: [{name: 'choices', value: '["rolled","stretched","crated","boxed"]'}],
    editor: 'artist',
  },
  {
    key: 'ships_from_city',
    name: 'Ships from (city)',
    description: 'Where the work is sent from.',
    type: 'single_line_text_field',
    editor: 'artist',
  },
  {
    key: 'ships_from_state',
    name: 'Ships from (state)',
    description: 'Where the work is sent from. Also what the "artist\'s state" filter reads.',
    type: 'metaobject_reference',
    validations: reference('phulhaar_state'),
    editor: 'artist',
    filter: true,
  },
  {
    key: 'dispatch_days',
    name: 'Dispatch time (days)',
    description: 'Working days between the order and the work leaving the artist.',
    type: 'number_integer',
    validations: [
      {name: 'min', value: '1'},
      {name: 'max', value: '60'},
    ],
    editor: 'artist',
  },

  // --- Availability and price --------------------------------------------
  {
    key: 'availability',
    name: 'Availability',
    description:
      'available, reserved, sold, not_for_sale or price_on_request. Stock of 1 makes an original ' +
      'read as sold on its own, so this covers only what stock cannot say: a work held for a ' +
      'buyer, one shown but not for sale, and one whose price is given on enquiry.',
    type: 'single_line_text_field',
    required: true,
    validations: [
      {
        name: 'choices',
        value: '["available","reserved","sold","not_for_sale","price_on_request"]',
      },
    ],
    editor: 'staff',
    filter: true,
  },

  // --- Colour -------------------------------------------------------------
  {
    key: 'colours',
    name: 'Dominant colours',
    description:
      'Extracted from the main image when it is uploaded, then editable by staff if the result ' +
      'reads wrongly -- a photograph of a painting under warm light often does.',
    type: 'list.metaobject_reference',
    validations: reference('phulhaar_colour'),
    editor: 'computed',
    filter: true,
  },

  // --- Review ------------------------------------------------------------
  {
    key: 'review_status',
    name: 'Review status',
    description:
      'Where the work is in the review. draft and in_review are the artist\'s side; ' +
      'changes_requested, approved and archived are staff\'s. A live work that is edited goes ' +
      'back to in_review while the live version stays as it was.',
    type: 'single_line_text_field',
    required: true,
    validations: [
      {
        name: 'choices',
        value: '["draft","in_review","changes_requested","approved","archived"]',
      },
    ],
    editor: 'staff',
  },
  {
    key: 'review_notes',
    name: 'Review notes',
    description:
      'What staff asked the artist to change. Shown to that artist and to staff, never on the ' +
      'storefront.',
    type: 'multi_line_text_field',
    editor: 'staff',
  },
  {
    key: 'submitted_at',
    name: 'Submitted for review',
    description: 'When the artist last submitted it, so the review queue can be ordered fairly.',
    type: 'date_time',
    editor: 'computed',
  },
];

/** Every metaobject definition the script manages, taxonomies and the artist alike. */
export function allMetaobjectTypes(): string[] {
  return [...TAXONOMIES.map((taxonomy) => taxonomy.type), ARTIST_METAOBJECT.type];
}

/** The metafield types Search & Discovery is able to build a storefront filter from. */
export const FILTERABLE_TYPES = new Set([
  'single_line_text_field',
  'list.single_line_text_field',
  'number_decimal',
  'number_integer',
  'boolean',
  'metaobject_reference',
  'list.metaobject_reference',
]);

/** Shopify's cap on filters per store, standard and custom together. */
export const FILTER_LIMIT = 25;
