/**
 * Create, read, update and delete for everything the admin manages: artworks (products with
 * their phulhaar metafields, price, stock and images), artists (phulhaar_artist metaobjects),
 * the taxonomy options the forms offer, and the gallery's settings.
 */
import {
  AdminError,
  check,
  publishEverywhere,
  setStock,
  stageUpload,
  uploadFileImage,
  type AdminClient,
} from '~/lib/admin-api.server';
import {computeArtworkFields} from '~/lib/schema-fields';

const NS = 'phulhaar';
type UserErrors = Array<{field?: string[] | null; message: string}>;

// ---------------------------------------------------------------------------------------------
// Options for reference fields

export type Options = Record<
  string,
  Array<{id: string; label: string; handle?: string}>
>;

/** Every entry of each metaobject type, as select options. */
export async function loadOptions(
  admin: AdminClient,
  types: string[],
): Promise<Options> {
  const entries = await Promise.all(
    types.map(async (type) => {
      const {metaobjects} = await admin<{
        metaobjects: {
          nodes: Array<{id: string; displayName: string; handle: string}>;
        };
      }>(
        `#graphql
        query Options($type: String!) {
          metaobjects(type: $type, first: 250, sortKey: "display_name") {
            nodes { id handle displayName }
          }
        }`,
        {type},
      );
      return [
        type,
        metaobjects.nodes.map((node) => ({
          id: node.id,
          label: node.displayName || node.handle,
          handle: node.handle,
        })),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// ---------------------------------------------------------------------------------------------
// Artworks

export interface ArtworkRow {
  id: string;
  title: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  vendor: string;
  tags: string[];
  updatedAt: string;
  totalInventory: number | null;
  image: string | null;
  price: string | null;
  currency: string | null;
  reviewStatus: string | null;
  availability: string | null;
}

const ROW_FIELDS = `
  id title handle status vendor tags updatedAt totalInventory
  featuredMedia { preview { image { url(transform: {maxWidth: 160}) } } }
  priceRangeV2 { minVariantPrice { amount currencyCode } }
  reviewStatus: metafield(namespace: "${NS}", key: "review_status") { value }
  availability: metafield(namespace: "${NS}", key: "availability") { value }
`;

type RawRow = Omit<
  ArtworkRow,
  'image' | 'price' | 'currency' | 'reviewStatus' | 'availability'
> & {
  featuredMedia: {preview: {image: {url: string} | null} | null} | null;
  priceRangeV2: {minVariantPrice: {amount: string; currencyCode: string}};
  reviewStatus: {value: string} | null;
  availability: {value: string} | null;
};

function toRow(node: RawRow): ArtworkRow {
  return {
    ...node,
    image: node.featuredMedia?.preview?.image?.url ?? null,
    price: node.priceRangeV2.minVariantPrice.amount,
    currency: node.priceRangeV2.minVariantPrice.currencyCode,
    reviewStatus: node.reviewStatus?.value ?? null,
    availability: node.availability?.value ?? null,
  };
}

export async function listArtworks(
  admin: AdminClient,
  {query, after}: {query: string; after?: string | null},
) {
  const {products} = await admin<{
    products: {
      nodes: RawRow[];
      pageInfo: {hasNextPage: boolean; endCursor: string | null};
    };
  }>(
    `#graphql
    query AdminArtworks($query: String, $after: String) {
      products(first: 50, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
        nodes { ${ROW_FIELDS} }
        pageInfo { hasNextPage endCursor }
      }
    }`,
    {query: query || null, after: after || null},
  );
  return {rows: products.nodes.map(toRow), pageInfo: products.pageInfo};
}

export async function countArtworks(admin: AdminClient) {
  const counts = await Promise.all(
    [
      'status:active',
      'status:draft',
      'status:archived',
      `metafields.${NS}.review_status:in_review`,
    ].map(async (query) => {
      const {productsCount} = await admin<{productsCount: {count: number}}>(
        `#graphql
          query Count($query: String) { productsCount(query: $query) { count } }`,
        {query},
      );
      return productsCount.count;
    }),
  );
  return {
    active: counts[0],
    draft: counts[1],
    archived: counts[2],
    inReview: counts[3],
  };
}

export interface ArtworkDetail {
  id: string;
  title: string;
  handle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  onlineStoreUrl: string | null;
  media: Array<{id: string; url: string; alt: string | null}>;
  variant: {
    id: string;
    price: string;
    compareAtPrice: string | null;
    inventoryItemId: string;
    inventoryQuantity: number | null;
  } | null;
  metafields: Record<string, string>;
}

export async function getArtwork(
  admin: AdminClient,
  id: string,
): Promise<ArtworkDetail | null> {
  const {product} = await admin<{
    product: null | {
      id: string;
      title: string;
      handle: string;
      status: ArtworkDetail['status'];
      descriptionHtml: string;
      vendor: string;
      productType: string;
      tags: string[];
      onlineStoreUrl: string | null;
      media: {
        nodes: Array<{
          id: string;
          alt: string | null;
          image?: {url: string} | null;
        }>;
      };
      variants: {
        nodes: Array<{
          id: string;
          price: string;
          compareAtPrice: string | null;
          inventoryQuantity: number | null;
          inventoryItem: {id: string};
        }>;
      };
      metafields: {nodes: Array<{key: string; value: string}>};
    };
  }>(
    `#graphql
    query AdminArtwork($id: ID!) {
      product(id: $id) {
        id title handle status descriptionHtml vendor productType tags onlineStoreUrl
        media(first: 30) {
          nodes { id alt ... on MediaImage { image { url(transform: {maxWidth: 600}) } } }
        }
        variants(first: 1) {
          nodes { id price compareAtPrice inventoryQuantity inventoryItem { id } }
        }
        metafields(first: 80, namespace: "${NS}") { nodes { key value } }
      }
    }`,
    {id},
  );
  if (!product) return null;
  const variant = product.variants.nodes[0];
  return {
    ...product,
    media: product.media.nodes
      .filter((node) => node.image?.url)
      .map((node) => ({id: node.id, url: node.image!.url, alt: node.alt})),
    variant: variant
      ? {
          id: variant.id,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          inventoryItemId: variant.inventoryItem.id,
          inventoryQuantity: variant.inventoryQuantity,
        }
      : null,
    metafields: Object.fromEntries(
      product.metafields.nodes.map((m) => [m.key, m.value]),
    ),
  };
}

export interface ArtworkInput {
  id?: string;
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  price: string;
  compareAtPrice: string | null;
  values: Record<string, string>;
  cleared: string[];
  types: Record<string, string>;
  newImages: File[];
  removeMedia: string[];
}

/** Create or update a work, its price, stock, images and every metafield, then publish it. */
export async function saveArtwork(
  admin: AdminClient,
  input: ArtworkInput,
): Promise<string> {
  const values = {...input.values, ...computeArtworkFields(input.values)};
  const metafields = Object.entries(values).map(([key, value]) => ({
    namespace: NS,
    key,
    type: input.types[key] ?? 'single_line_text_field',
    value,
  }));

  const media = await Promise.all(
    input.newImages.map(async (file) => ({
      originalSource: await stageUpload(admin, file),
      mediaContentType: 'IMAGE',
      alt: `${input.title}${input.vendor ? `, by ${input.vendor}` : ''}`,
    })),
  );

  const product = {
    title: input.title,
    descriptionHtml: input.descriptionHtml,
    vendor: input.vendor,
    productType: input.productType,
    tags: input.tags,
    status: input.status,
    metafields,
  };

  let id = input.id;
  if (!id) {
    const {productCreate} = await admin<{
      productCreate: {product: {id: string} | null; userErrors: UserErrors};
    }>(
      `#graphql
      mutation CreateArtwork($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
        productCreate(product: $product, media: $media) {
          product { id }
          userErrors { field message }
        }
      }`,
      {product, media},
    );
    check(productCreate.userErrors, 'create the work');
    id = productCreate.product!.id;
  } else {
    const {productUpdate} = await admin<{
      productUpdate: {userErrors: UserErrors};
    }>(
      `#graphql
      mutation UpdateArtwork($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
        productUpdate(product: $product, media: $media) { userErrors { field message } }
      }`,
      {product: {id, ...product}, media},
    );
    check(productUpdate.userErrors, 'save the work');

    const clear = input.cleared.filter((key) => !(key in values));
    if (clear.length) {
      const {metafieldsDelete} = await admin<{
        metafieldsDelete: {userErrors: UserErrors};
      }>(
        `#graphql
        mutation Clear($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) { userErrors { field message } }
        }`,
        {metafields: clear.map((key) => ({ownerId: id, namespace: NS, key}))},
      );
      check(metafieldsDelete.userErrors, 'clear the emptied fields');
    }

    if (input.removeMedia.length) {
      const {fileUpdate} = await admin<{fileUpdate: {userErrors: UserErrors}}>(
        `#graphql
        mutation Detach($files: [FileUpdateInput!]!) {
          fileUpdate(files: $files) { userErrors { field message } }
        }`,
        {
          files: input.removeMedia.map((mediaId) => ({
            id: mediaId,
            referencesToRemove: [id],
          })),
        },
      );
      check(fileUpdate.userErrors, 'remove the images');
    }
  }

  // Price, and stock of one for an original (none once it is sold).
  const current = await getArtwork(admin, id);
  const variant = current?.variant;
  if (variant) {
    const {productVariantsBulkUpdate} = await admin<{
      productVariantsBulkUpdate: {userErrors: UserErrors};
    }>(
      `#graphql
      mutation Price($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { field message }
        }
      }`,
      {
        productId: id,
        variants: [
          {
            id: variant.id,
            price: input.price,
            compareAtPrice: input.compareAtPrice,
            inventoryPolicy: 'DENY',
            inventoryItem: {tracked: true, requiresShipping: true},
          },
        ],
      },
    );
    check(productVariantsBulkUpdate.userErrors, 'set the price');

    const rarity = values.rarity ?? 'original';
    if (rarity === 'original') {
      const sold = values.availability === 'sold';
      await setStock(admin, variant.inventoryItemId, sold ? 0 : 1);
    }
  }

  if (input.status === 'ACTIVE') await publishEverywhere(admin, id);
  return id;
}

export async function deleteArtwork(admin: AdminClient, id: string) {
  const {productDelete} = await admin<{
    productDelete: {userErrors: UserErrors};
  }>(
    `#graphql
    mutation DeleteArtwork($input: ProductDeleteInput!) {
      productDelete(input: $input) { deletedProductId userErrors { field message } }
    }`,
    {input: {id}},
  );
  check(productDelete.userErrors, 'delete the work');
}

/** Approve, ask for changes, archive: the review in one call. */
export async function reviewArtwork(
  admin: AdminClient,
  id: string,
  decision: 'approved' | 'changes_requested' | 'archived',
  notes: string,
) {
  const status =
    decision === 'approved'
      ? 'ACTIVE'
      : decision === 'archived'
        ? 'ARCHIVED'
        : 'DRAFT';
  const {productUpdate} = await admin<{
    productUpdate: {userErrors: UserErrors};
  }>(
    `#graphql
    mutation Review($product: ProductUpdateInput!) {
      productUpdate(product: $product) { userErrors { field message } }
    }`,
    {
      product: {
        id,
        status,
        metafields: [
          {
            namespace: NS,
            key: 'review_status',
            type: 'single_line_text_field',
            value: decision,
          },
          ...(notes
            ? [
                {
                  namespace: NS,
                  key: 'review_notes',
                  type: 'multi_line_text_field',
                  value: notes,
                },
              ]
            : []),
        ],
      },
    },
  );
  check(productUpdate.userErrors, 'record the review');
  if (status === 'ACTIVE') await publishEverywhere(admin, id);
}

/** Replace a work's tags only: what an artist may change on their own work. */
export async function setTags(admin: AdminClient, id: string, tags: string[]) {
  const {productUpdate} = await admin<{
    productUpdate: {userErrors: UserErrors};
  }>(
    `#graphql
    mutation Tags($product: ProductUpdateInput!) {
      productUpdate(product: $product) { userErrors { field message } }
    }`,
    {product: {id, tags}},
  );
  check(productUpdate.userErrors, 'save the tags');
}

/** The Artist ID on the profile a work points at, for checking ownership on every request. */
export async function ownerOf(admin: AdminClient, productId: string) {
  const {product} = await admin<{
    product: null | {
      title: string;
      tags: string[];
      artist: {reference: {artistId: {value: string} | null} | null} | null;
    };
  }>(
    `#graphql
    query Owner($id: ID!) {
      product(id: $id) {
        title tags
        artist: metafield(namespace: "${NS}", key: "artist") {
          reference { ... on Metaobject { artistId: field(key: "artist_id") { value } } }
        }
      }
    }`,
    {id: productId},
  );
  if (!product) return null;
  return {
    title: product.title,
    tags: product.tags,
    artistId: product.artist?.reference?.artistId?.value ?? null,
  };
}

// ---------------------------------------------------------------------------------------------
// Metaobjects: artists and the gallery settings

export interface MetaobjectDetail {
  id: string;
  handle: string;
  displayName: string;
  updatedAt: string;
  fields: Record<string, string>;
  images: Record<string, string>;
}

const METAOBJECT_FIELDS = `
  id handle displayName updatedAt
  fields {
    key value
    reference { ... on MediaImage { image { url(transform: {maxWidth: 300}) } } }
  }
`;

type RawMetaobject = {
  id: string;
  handle: string;
  displayName: string;
  updatedAt: string;
  fields: Array<{
    key: string;
    value: string | null;
    reference?: {image?: {url: string}} | null;
  }>;
};

function toDetail(node: RawMetaobject): MetaobjectDetail {
  return {
    id: node.id,
    handle: node.handle,
    displayName: node.displayName,
    updatedAt: node.updatedAt,
    fields: Object.fromEntries(node.fields.map((f) => [f.key, f.value ?? ''])),
    images: Object.fromEntries(
      node.fields
        .filter((f) => f.reference?.image?.url)
        .map((f) => [f.key, f.reference!.image!.url]),
    ),
  };
}

export async function listMetaobjects(
  admin: AdminClient,
  type: string,
  query?: string,
) {
  const {metaobjects} = await admin<{metaobjects: {nodes: RawMetaobject[]}}>(
    `#graphql
    query List($type: String!, $query: String) {
      metaobjects(type: $type, first: 250, query: $query, sortKey: "display_name") {
        nodes { ${METAOBJECT_FIELDS} }
      }
    }`,
    {type, query: query || null},
  );
  return metaobjects.nodes.map(toDetail);
}

export async function getMetaobject(admin: AdminClient, id: string) {
  const {metaobject} = await admin<{metaobject: RawMetaobject | null}>(
    `#graphql
    query One($id: ID!) { metaobject(id: $id) { ${METAOBJECT_FIELDS} } }`,
    {id},
  );
  return metaobject ? toDetail(metaobject) : null;
}

export async function getMetaobjectByHandle(
  admin: AdminClient,
  type: string,
  handle: string,
) {
  const {metaobjectByHandle} = await admin<{
    metaobjectByHandle: RawMetaobject | null;
  }>(
    `#graphql
    query ByHandle($handle: MetaobjectHandleInput!) {
      metaobjectByHandle(handle: $handle) { ${METAOBJECT_FIELDS} }
    }`,
    {handle: {type, handle}},
  );
  return metaobjectByHandle ? toDetail(metaobjectByHandle) : null;
}

/**
 * Create or update by handle. Upsert rather than create-then-update so a double submit, or two
 * people saving at once, can never leave two artists with the same handle.
 */
export async function upsertMetaobject(
  admin: AdminClient,
  {
    type,
    handle,
    values,
    images,
  }: {
    type: string;
    handle: string;
    values: Record<string, string>;
    images?: Record<string, File>;
  },
) {
  const uploaded: Record<string, string> = {};
  for (const [key, file] of Object.entries(images ?? {})) {
    uploaded[key] = await uploadFileImage(
      admin,
      file,
      values.display_name ?? handle,
    );
  }
  const fields = Object.entries({...values, ...uploaded}).map(
    ([key, value]) => ({key, value}),
  );

  const {metaobjectUpsert} = await admin<{
    metaobjectUpsert: {
      metaobject: {id: string; handle: string} | null;
      userErrors: UserErrors;
    };
  }>(
    `#graphql
    mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
      metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
        metaobject { id handle }
        userErrors { field message }
      }
    }`,
    {
      handle: {type, handle},
      metaobject: {fields, capabilities: {publishable: {status: 'ACTIVE'}}},
    },
  );
  check(metaobjectUpsert.userErrors, 'save');
  return metaobjectUpsert.metaobject!;
}

export async function deleteMetaobject(admin: AdminClient, id: string) {
  const {metaobjectDelete} = await admin<{
    metaobjectDelete: {userErrors: UserErrors};
  }>(
    `#graphql
    mutation Delete($id: ID!) {
      metaobjectDelete(id: $id) { deletedId userErrors { field message } }
    }`,
    {id},
  );
  check(metaobjectDelete.userErrors, 'delete');
}

/** How many works point at an artist: an artist with works cannot be deleted by accident. */
export async function worksForArtist(admin: AdminClient, artistGid: string) {
  const {productsCount} = await admin<{productsCount: {count: number}}>(
    `#graphql
    query Works($query: String) { productsCount(query: $query) { count } }`,
    {query: `metafields.${NS}.artist:"${artistGid}"`},
  );
  return productsCount.count;
}

export {AdminError};
