/**
 * Creates and updates the store's custom data schema from `scripts/shopify/definitions.ts`.
 *
 * It is idempotent. Run it against a fresh development store and it creates every metaobject
 * definition, every taxonomy entry and every product metafield definition. Run it again and it
 * reports that there is nothing to do. Change a description in the definitions file, run it again,
 * and only that description is updated. This is what makes the store's schema something that lives
 * in the repository and arrives by pull request rather than by somebody clicking in the admin.
 *
 * It never deletes. Removing a metafield definition deletes every value stored under it across the
 * whole catalogue, which is not a thing a script should do on its own, so a field that is no longer
 * wanted is reported and removed by hand after someone has looked at what is in it.
 *
 *   pnpm shopify:setup --dry-run     what it would do, with no network calls at all
 *   pnpm shopify:setup               do it
 *
 * It needs PUBLIC_STORE_DOMAIN and PRIVATE_ADMIN_API_TOKEN. The token can write products and files,
 * so it is the most dangerous value in the project: docs/SETUP.md shows how to get it into the
 * environment without it passing through a chat window or a shell history.
 */

import {
  ADMIN_API_VERSION,
  ARTIST_METAOBJECT,
  NAMESPACE,
  PRODUCT_METAFIELDS,
  TAXONOMIES,
  type FieldDefinition,
  type TaxonomyDefinition,
} from './shopify/definitions.ts';

const dryRun = process.argv.includes('--dry-run');

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{message: string}>;
}

/** What the script did, printed as a summary at the end. */
const tally = {created: 0, updated: 0, unchanged: 0};

// ---------------------------------------------------------------------------
// The Admin API client
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`${name} is not set. Copy .env.example to .env and see docs/SETUP.md.`);
    process.exit(1);
  }
  return value;
}

let request: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;

if (dryRun) {
  request = async () => {
    throw new Error('a dry run must not reach the network');
  };
} else {
  const domain = requireEnv('PUBLIC_STORE_DOMAIN');
  const token = requireEnv('PRIVATE_ADMIN_API_TOKEN');
  const endpoint = `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

  request = async function adminRequest<T>(query: string, variables = {}): Promise<T> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    });

    if (response.status === 429) {
      // The Admin API's cost-based limit. One wait is enough in practice for a script this size.
      const retryAfter = Number(response.headers.get('retry-after') ?? 2);
      console.warn(`  rate limited, waiting ${retryAfter}s`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return adminRequest<T>(query, variables);
    }

    if (!response.ok) {
      throw new Error(
        `Shopify answered ${response.status}. ` +
          (response.status === 401 || response.status === 403
            ? 'The Admin API token is wrong, or lacks the scopes in docs/ARCHITECTURE.md.'
            : await response.text()),
      );
    }

    const payload = (await response.json()) as GraphQLResponse<T>;

    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join('; '));
    }

    return payload.data!;
  };
}

/**
 * Shopify reports a refused mutation as a `userErrors` entry with a 200 status, so a run that
 * ignored them would look like it had succeeded while changing nothing.
 */
function assertNoUserErrors(
  what: string,
  result: {userErrors?: Array<{field?: string[] | null; message: string; code?: string}>},
): void {
  const errors = result.userErrors ?? [];
  if (errors.length === 0) return;

  console.error(`\nShopify refused ${what}:`);
  for (const error of errors) {
    console.error(`  ${error.field?.join('.') ?? '(no field)'}: ${error.message}`);
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Metaobject definitions
// ---------------------------------------------------------------------------

const EXISTING_METAOBJECTS = `
  query ExistingMetaobjectDefinitions {
    metaobjectDefinitions(first: 100) {
      nodes {
        id
        type
        name
        fieldDefinitions { key name type { name } }
      }
    }
  }
`;

const CREATE_METAOBJECT = `
  mutation CreateMetaobjectDefinition($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;

const UPDATE_METAOBJECT = `
  mutation UpdateMetaobjectDefinition($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
    metaobjectDefinitionUpdate(id: $id, definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }
`;

const UPSERT_METAOBJECT_ENTRY = `
  mutation UpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message code }
    }
  }
`;

interface ExistingMetaobject {
  id: string;
  type: string;
  name: string;
  fieldDefinitions: Array<{key: string; name: string; type: {name: string}}>;
}

/** A field definition in the shape the metaobject mutations want. */
function metaobjectField(field: FieldDefinition) {
  return {
    key: field.key,
    name: field.name,
    description: field.description,
    type: field.type,
    required: field.required ?? false,
    validations: field.validations ?? [],
  };
}

/**
 * The fields a taxonomy metaobject has: a display name, and for the colour taxonomy a swatch.
 *
 * Search & Discovery will only render a colour filter as swatches when the metaobject carries an
 * actual colour field alongside a single-value text field for its name, which is the reason the
 * colour taxonomy is shaped differently from the others.
 */
function taxonomyFields(taxonomy: TaxonomyDefinition): FieldDefinition[] {
  const fields: FieldDefinition[] = [
    {
      key: 'name',
      name: 'Name',
      description: 'How this reads on the site.',
      type: 'single_line_text_field',
      required: true,
    },
  ];

  if (taxonomy.withColour) {
    fields.push({
      key: 'swatch',
      name: 'Swatch',
      description: 'The colour shown in the filter.',
      type: 'color',
    });
  }

  return fields;
}

async function syncMetaobjectDefinition(
  existing: Map<string, ExistingMetaobject>,
  definition: {type: string; name: string; description: string; fields: FieldDefinition[]},
): Promise<void> {
  const current = existing.get(definition.type);
  const fieldDefinitions = definition.fields.map(metaobjectField);

  if (!current) {
    console.log(`  + ${definition.type} (${fieldDefinitions.length} fields)`);
    tally.created += 1;
    if (dryRun) return;

    const result = await request<{
      metaobjectDefinitionCreate: {userErrors: Array<{message: string}>};
    }>(CREATE_METAOBJECT, {
      definition: {
        type: definition.type,
        name: definition.name,
        description: definition.description,
        fieldDefinitions,
        // Entries have to be publishable for the storefront to read them at all, and the
        // storefront is the only reason they exist.
        capabilities: {publishable: {enabled: true}},
        access: {storefront: 'PUBLIC_READ'},
      },
    });

    assertNoUserErrors(`creating ${definition.type}`, result.metaobjectDefinitionCreate);
    return;
  }

  // A field that exists keeps its type: Shopify will not change one, and trying is how a run ends
  // halfway through. New fields are added; names and descriptions are brought up to date.
  const known = new Set(current.fieldDefinitions.map((field) => field.key));
  const toCreate = fieldDefinitions.filter((field) => !known.has(field.key));
  const toUpdate = fieldDefinitions.filter((field) => known.has(field.key));

  const mismatched = definition.fields.filter((field) => {
    const live = current.fieldDefinitions.find((candidate) => candidate.key === field.key);
    return live && live.type.name !== field.type;
  });

  for (const field of mismatched) {
    const live = current.fieldDefinitions.find((candidate) => candidate.key === field.key)!;
    console.warn(
      `  ! ${definition.type}.${field.key} is ${live.type.name} at the store but ${field.type} ` +
        'here. Shopify cannot change a field\'s type; this needs a new field and a migration.',
    );
  }

  if (toCreate.length === 0 && toUpdate.length === 0) {
    tally.unchanged += 1;
    return;
  }

  console.log(
    `  ~ ${definition.type}` +
      (toCreate.length > 0 ? ` (+${toCreate.length} field(s))` : '') +
      (toUpdate.length > 0 ? ` (${toUpdate.length} refreshed)` : ''),
  );
  tally.updated += 1;
  if (dryRun) return;

  const result = await request<{
    metaobjectDefinitionUpdate: {userErrors: Array<{message: string}>};
  }>(UPDATE_METAOBJECT, {
    id: current.id,
    definition: {
      name: definition.name,
      description: definition.description,
      fieldDefinitions: [
        ...toCreate.map((field) => ({create: field})),
        ...toUpdate.map(({key, name, description, required, validations}) => ({
          update: {key, name, description, required, validations},
        })),
      ],
      capabilities: {publishable: {enabled: true}},
      access: {storefront: 'PUBLIC_READ'},
    },
  });

  assertNoUserErrors(`updating ${definition.type}`, result.metaobjectDefinitionUpdate);
}

/**
 * Seed a taxonomy's entries.
 *
 * `metaobjectUpsert` keyed on the handle is what makes this safe to run repeatedly: an entry staff
 * have renamed in the admin keeps its handle, so it is matched and not duplicated. The name is
 * written on every run, which means the definitions file is the authority on spelling -- that is
 * the point of having a taxonomy at all.
 *
 * Entries are never removed. Deleting one would strip it from every artwork referencing it.
 */
async function seedTaxonomy(taxonomy: TaxonomyDefinition): Promise<void> {
  for (const entry of taxonomy.entries) {
    if (dryRun) continue;

    const fields = [{key: 'name', value: entry.name}];

    const result = await request<{metaobjectUpsert: {userErrors: Array<{message: string}>}}>(
      UPSERT_METAOBJECT_ENTRY,
      {
        handle: {type: taxonomy.type, handle: entry.handle},
        metaobject: {
          fields,
          capabilities: {publishable: {status: 'ACTIVE'}},
        },
      },
    );

    assertNoUserErrors(`seeding ${taxonomy.type}/${entry.handle}`, result.metaobjectUpsert);
  }

  const count = taxonomy.entries.length;
  console.log(`  = ${taxonomy.type}: ${count} entr${count === 1 ? 'y' : 'ies'} present`);
}

// ---------------------------------------------------------------------------
// Product metafield definitions
// ---------------------------------------------------------------------------

const EXISTING_METAFIELDS = `
  query ExistingMetafieldDefinitions($namespace: String!) {
    metafieldDefinitions(first: 250, ownerType: PRODUCT, namespace: $namespace) {
      nodes { id key name type { name } }
    }
  }
`;

const CREATE_METAFIELD = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id key }
      userErrors { field message code }
    }
  }
`;

const UPDATE_METAFIELD = `
  mutation UpdateMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
    metafieldDefinitionUpdate(definition: $definition) {
      updatedDefinition { id key }
      userErrors { field message code }
    }
  }
`;

async function syncProductMetafields(): Promise<void> {
  const live = dryRun
    ? new Map<string, {id: string; key: string; type: {name: string}}>()
    : new Map(
        (
          await request<{
            metafieldDefinitions: {nodes: Array<{id: string; key: string; type: {name: string}}>};
          }>(EXISTING_METAFIELDS, {namespace: NAMESPACE})
        ).metafieldDefinitions.nodes.map((node) => [node.key, node]),
      );

  for (const field of PRODUCT_METAFIELDS) {
    const current = live.get(field.key);

    const common = {
      name: field.name,
      namespace: NAMESPACE,
      key: field.key,
      description: field.description,
      ownerType: 'PRODUCT',
      validations: field.validations ?? [],
      // The storefront has to be able to read every one of these: they are what the artwork page
      // and the filters are built from. None of them is private.
      access: {admin: 'MERCHANT_READ_WRITE', storefront: 'PUBLIC_READ'},
    };

    if (!current) {
      console.log(`  + ${NAMESPACE}.${field.key} (${field.type})`);
      tally.created += 1;
      if (dryRun) continue;

      const result = await request<{
        metafieldDefinitionCreate: {userErrors: Array<{message: string}>};
      }>(CREATE_METAFIELD, {
        definition: {
          ...common,
          type: field.type,
          // Pinned, so the fields appear on the product page in the admin instead of behind a
          // "show all" link. Staff reviewing a work should not have to go looking for them.
          //
          // Shopify has no "required" for a product metafield -- only metaobject fields have one
          // -- so the `required` flag in the definitions file is enforced by the artist studio's
          // own validation when a work is submitted, not by the store.
          pin: true,
        },
      });

      assertNoUserErrors(`creating ${NAMESPACE}.${field.key}`, result.metafieldDefinitionCreate);
      continue;
    }

    if (current.type.name !== field.type) {
      console.warn(
        `  ! ${NAMESPACE}.${field.key} is ${current.type.name} at the store but ${field.type} ` +
          'here. Shopify cannot change a metafield\'s type once values exist; this needs a new ' +
          'key and a migration.',
      );
      tally.unchanged += 1;
      continue;
    }

    console.log(`  ~ ${NAMESPACE}.${field.key}`);
    tally.updated += 1;
    if (dryRun) continue;

    const result = await request<{
      metafieldDefinitionUpdate: {userErrors: Array<{message: string}>};
    }>(UPDATE_METAFIELD, {
      definition: {
        name: common.name,
        namespace: common.namespace,
        key: common.key,
        description: common.description,
        ownerType: common.ownerType,
        validations: common.validations,
        access: common.access,
        pin: true,
      },
    });

    assertNoUserErrors(`updating ${NAMESPACE}.${field.key}`, result.metafieldDefinitionUpdate);
  }

  // Reported, never deleted: the values under a definition go with it.
  const wanted = new Set(PRODUCT_METAFIELDS.map((field) => field.key));
  const orphans = [...live.keys()].filter((key) => !wanted.has(key));

  if (orphans.length > 0) {
    console.warn(
      `\n  ! the store has ${orphans.length} metafield definition(s) this repository does not ` +
        `know about: ${orphans.join(', ')}.\n    Nothing was deleted. Look at what is stored ` +
        'under them before removing them by hand.',
    );
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (dryRun) {
    console.log('A dry run: nothing is sent to Shopify, and the store is assumed to be empty.\n');
  } else {
    console.log(`Setting up ${process.env.PUBLIC_STORE_DOMAIN} (Admin API ${ADMIN_API_VERSION})\n`);
  }

  const existing = dryRun
    ? new Map<string, ExistingMetaobject>()
    : new Map(
        (
          await request<{metaobjectDefinitions: {nodes: ExistingMetaobject[]}}>(
            EXISTING_METAOBJECTS,
          )
        ).metaobjectDefinitions.nodes.map((node) => [node.type, node]),
      );

  console.log('Taxonomies');
  for (const taxonomy of TAXONOMIES) {
    await syncMetaobjectDefinition(existing, {
      type: taxonomy.type,
      name: taxonomy.name,
      description: taxonomy.description,
      fields: taxonomyFields(taxonomy),
    });
  }

  console.log('\nTaxonomy entries');
  for (const taxonomy of TAXONOMIES) {
    await seedTaxonomy(taxonomy);
  }

  console.log('\nArtists');
  await syncMetaobjectDefinition(existing, ARTIST_METAOBJECT);

  console.log('\nArtwork fields');
  await syncProductMetafields();

  const filters = PRODUCT_METAFIELDS.filter((field) => field.filter);

  console.log(
    `\n${tally.created} created, ${tally.updated} updated, ${tally.unchanged} already right.`,
  );
  console.log(
    `\n${filters.length} of these are meant to be storefront filters. Shopify does not let a ` +
      'script turn them on:\nopen the free Search & Discovery app and add each one as a filter ' +
      '(docs/DATA-MODEL.md lists them).',
  );
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
