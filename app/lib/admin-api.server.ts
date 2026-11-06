/**
 * Shopify's Admin API, for the admin panel and the studio. Server-only: the token can create,
 * change and publish products, so it never reaches a browser.
 *
 * Scopes the custom app needs (docs/SETUP.md): read_products, write_products, write_files,
 * read_files, read_metaobjects, write_metaobjects, read_inventory, write_inventory,
 * read_locations, read_publications, write_publications, read_orders.
 */
import type {PhulhaarEnv} from '~/lib/env.server';

export class AdminError extends Error {
  constructor(
    message: string,
    readonly detail: string[] = [],
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

export interface AdminClient {
  <T>(query: string, variables?: Record<string, unknown>): Promise<T>;
  domain: string;
}

/** The client, or null when the store is not connected yet (mock.shop has no Admin API). */
export function adminClient(env: PhulhaarEnv): AdminClient | null {
  const domain = env.PUBLIC_STORE_DOMAIN;
  const token = env.PRIVATE_ADMIN_API_TOKEN;
  if (!token || !domain || domain === 'mock.shop') return null;
  const version = env.PRIVATE_ADMIN_API_VERSION || '2026-10';
  const endpoint = `https://${domain.replace(/^https?:\/\//, '')}/admin/api/${version}/graphql.json`;

  const client = (async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    });
    if (!response.ok) {
      throw new AdminError(`Shopify answered ${response.status}`, [
        response.status === 401
          ? 'The Admin API token is wrong, or the app was not reinstalled after its scopes changed.'
          : await response.text().catch(() => ''),
      ]);
    }
    const body = (await response.json()) as {
      data?: T;
      errors?: Array<{message: string}>;
    };
    if (body.errors?.length) {
      throw new AdminError(
        'Shopify refused the request',
        body.errors.map((error) => error.message),
      );
    }
    return body.data as T;
  }) as AdminClient;
  client.domain = domain;
  return client;
}

export function requireAdmin(env: PhulhaarEnv): AdminClient {
  const client = adminClient(env);
  if (!client) {
    throw new AdminError('The store is not connected', [
      'Set PUBLIC_STORE_DOMAIN to the *.myshopify.com domain and PRIVATE_ADMIN_API_TOKEN, as in docs/SETUP.md.',
    ]);
  }
  return client;
}

type UserErrors = Array<{field?: string[] | null; message: string}>;

/** Throw Shopify's user errors as one readable error. */
export function check(errors: UserErrors | undefined | null, what: string) {
  if (errors && errors.length > 0) {
    throw new AdminError(
      `Could not ${what}`,
      errors.map((error) =>
        error.field?.length
          ? `${error.field.join('.')}: ${error.message}`
          : error.message,
      ),
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Uploads: a browser file → Shopify's staged upload → a URL Shopify can attach as media.

export async function stageUpload(
  admin: AdminClient,
  file: File,
): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif|avif|heic)$/.test(file.type)) {
    throw new AdminError('That file is not an image', [
      `${file.name} is ${file.type || 'of an unknown type'}. Use JPEG, PNG, WebP, AVIF or HEIC.`,
    ]);
  }
  const {stagedUploadsCreate} = await admin<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string;
        resourceUrl: string;
        parameters: Array<{name: string; value: string}>;
      }>;
      userErrors: UserErrors;
    };
  }>(
    `#graphql
    mutation Stage($input: [StagedUploadInput!]!) {
      stagedUploadsCreate(input: $input) {
        stagedTargets { url resourceUrl parameters { name value } }
        userErrors { field message }
      }
    }`,
    {
      input: [
        {
          filename: file.name || 'artwork.jpg',
          mimeType: file.type,
          fileSize: String(file.size),
          resource: 'IMAGE',
          httpMethod: 'POST',
        },
      ],
    },
  );
  check(stagedUploadsCreate.userErrors, 'prepare the upload');
  const target = stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const {name, value} of target.parameters) form.append(name, value);
  form.append('file', file);
  const upload = await fetch(target.url, {method: 'POST', body: form});
  if (!upload.ok) {
    throw new AdminError('The image upload failed', [
      `Storage answered ${upload.status}`,
    ]);
  }
  return target.resourceUrl;
}

/** Upload an image into Files and return its MediaImage id (for an artist's portrait). */
export async function uploadFileImage(
  admin: AdminClient,
  file: File,
  alt: string,
) {
  const source = await stageUpload(admin, file);
  const {fileCreate} = await admin<{
    fileCreate: {files: Array<{id: string}>; userErrors: UserErrors};
  }>(
    `#graphql
    mutation File($files: [FileCreateInput!]!) {
      fileCreate(files: $files) { files { id } userErrors { field message } }
    }`,
    {files: [{originalSource: source, contentType: 'IMAGE', alt}]},
  );
  check(fileCreate.userErrors, 'save the image');
  return fileCreate.files[0].id;
}

// ---------------------------------------------------------------------------------------------
// Publishing

/** Publish to every sales channel the app can see, so the storefront and the admin agree. */
export async function publishEverywhere(admin: AdminClient, id: string) {
  const {publications} = await admin<{
    publications: {nodes: Array<{id: string}>};
  }>(
    `#graphql
    query Publications { publications(first: 20) { nodes { id } } }`,
  );
  if (publications.nodes.length === 0) return;
  const {publishablePublish} = await admin<{
    publishablePublish: {userErrors: UserErrors};
  }>(
    `#graphql
    mutation Publish($id: ID!, $input: [PublicationInput!]!) {
      publishablePublish(id: $id, input: $input) { userErrors { field message } }
    }`,
    {id, input: publications.nodes.map((node) => ({publicationId: node.id}))},
  );
  check(publishablePublish.userErrors, 'publish the work');
}

/** Set the stock of a one-off original: 1 while it is for sale, 0 once it is sold. */
export async function setStock(
  admin: AdminClient,
  inventoryItemId: string,
  quantity: number,
) {
  // `location` with no ID is the store's primary location, where an original is kept; the first
  // active location is the fallback for a store that has none marked.
  const {location, locations} = await admin<{
    location: {id: string} | null;
    locations: {nodes: Array<{id: string}>};
  }>(
    `#graphql
    query Locations {
      location { id }
      locations(first: 1, query: "active:true") { nodes { id } }
    }`,
  );
  const locationId = location?.id ?? locations.nodes[0]?.id;
  if (!locationId) {
    throw new AdminError('The store has no location to hold stock', [
      'Add a location in Shopify admin, Settings, Locations.',
    ]);
  }
  const {inventorySetQuantities} = await admin<{
    inventorySetQuantities: {userErrors: UserErrors};
  }>(
    `#graphql
    mutation Stock($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) { userErrors { field message } }
    }`,
    {
      input: {
        name: 'available',
        reason: 'correction',
        ignoreCompareQuantity: true,
        quantities: [{inventoryItemId, locationId, quantity}],
      },
    },
  );
  check(inventorySetQuantities.userErrors, 'set the stock');
}

/** Turn a failure into something a form can show, and let redirects and responses through. */
export function failure(error: unknown): {message: string; detail: string[]} {
  if (error instanceof AdminError)
    return {message: error.message, detail: error.detail};
  if (error instanceof Response) throw error;
  console.error(error);
  return {
    message: 'Something went wrong',
    detail: [error instanceof Error ? error.message : String(error)],
  };
}

export {gid, numericId} from './ids';
