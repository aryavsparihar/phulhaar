/**
 * The single description of what this app expects in its environment.
 *
 * Oxygen hands the worker an `Env` object rather than filling `process.env`, so validation happens
 * once per request context, in `createHydrogenRouterContext`, instead of at module load. The cost
 * is a few microseconds and the gain is that a missing or malformed secret fails immediately and
 * says which one, rather than surfacing later as an unexplained Shopify error.
 *
 * Variables are split in three:
 *
 * - `public` is readable in the browser bundle. Shopify's own convention is the `PUBLIC_` prefix.
 * - `secret` must never leave the server. Nothing here may be passed into a loader's return value
 *   or a component's props.
 * - Some are only needed once a feature exists, so they are optional until it does. The artist
 *   studio cannot start without the PJK values, and `requirePjkEnv` is what asserts that at the
 *   edge of the studio's routes rather than for every visitor to the catalogue.
 */

import {z} from 'zod';

/** A non-empty string, trimmed, with a readable complaint when it is missing. */
const required = (what: string) =>
  z
    .string({error: `${what} is not set`})
    .trim()
    .min(1, `${what} is empty`);

/** Optional, but if present it must be a real value rather than an empty placeholder. */
const optional = () => z.string().trim().min(1).optional().catch(undefined);

const schema = z.object({
  // Hydrogen's session cookie. 32 characters is the shortest that is worth signing with.
  SESSION_SECRET: required('SESSION_SECRET').min(
    32,
    'SESSION_SECRET must be at least 32 characters',
  ),

  // Storefront API. mock.shop needs no token, so the token stays optional and the storefront
  // client is given an empty string, which is what Hydrogen's own quickstart does.
  PUBLIC_STORE_DOMAIN: required('PUBLIC_STORE_DOMAIN'),
  PUBLIC_STOREFRONT_API_TOKEN: optional(),
  PUBLIC_STOREFRONT_ID: optional(),
  PUBLIC_CHECKOUT_DOMAIN: optional(),

  // Buyers' accounts. Absent until the store has customer accounts switched on.
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: optional(),
  PUBLIC_CUSTOMER_ACCOUNT_API_URL: optional(),

  // Admin API. Only the studio and the setup script need it; the catalogue never does.
  PRIVATE_ADMIN_API_TOKEN: optional(),
  PRIVATE_ADMIN_API_VERSION: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'PRIVATE_ADMIN_API_VERSION must look like 2026-10')
    .default('2026-10'),

  // PJK, the identity provider. Optional until the artist studio ships.
  PJK_BASE_URL: z.string().trim().url().optional().catch(undefined),
  PJK_SHARED_SECRET: optional(),
  PJK_PUBLIC_KEY: optional(),
  PJK_WEBHOOK_SECRET: optional(),

  // The gallery itself.
  PHULHAAR_ENQUIRY_EMAIL: z
    .string()
    .trim()
    .email('PHULHAAR_ENQUIRY_EMAIL must be an email address')
    .optional()
    .catch(undefined),
  PHULHAAR_SITE_URL: z.string().trim().url().optional().catch(undefined),
});

export type PhulhaarEnv = z.infer<typeof schema>;

/** The variable names that are allowed to reach the browser. Used by the env check script. */
export const PUBLIC_PREFIX = 'PUBLIC_';

/** Every name the schema knows, so `pnpm check:env` can compare it with `.env.example`. */
export const ENV_KEYS = Object.keys(schema.shape).sort();

/**
 * Validate the environment, or throw with every problem at once.
 *
 * Reporting all of them together matters on a first set-up, where three variables are usually
 * missing and discovering them one restart at a time is tedious.
 */
export function parseEnv(raw: unknown): PhulhaarEnv {
  const result = schema.safeParse(raw ?? {});

  if (!result.success) {
    const problems = result.error.issues
      .map(
        (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
      )
      .join('\n');

    throw new Error(
      `The environment is not usable. Copy .env.example to .env and fill these in:\n${problems}`,
    );
  }

  return result.data;
}

/**
 * The PJK values, asserted together.
 *
 * Artist sign-in is useless with only some of them, and a half-configured identity provider is
 * worse than an obviously absent one: it fails at the point where someone is trying to sign in.
 * The studio's routes call this before they do anything else.
 */
export function requirePjkEnv(env: PhulhaarEnv) {
  const missing = (
    [
      'PJK_BASE_URL',
      'PJK_SHARED_SECRET',
      'PJK_PUBLIC_KEY',
      'PJK_WEBHOOK_SECRET',
    ] as const
  ).filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Artist sign-in needs PJK configured. Missing: ${missing.join(', ')}. See docs/PJK-INTEGRATION.md.`,
    );
  }

  return {
    baseUrl: env.PJK_BASE_URL!,
    sharedSecret: env.PJK_SHARED_SECRET!,
    publicKey: env.PJK_PUBLIC_KEY!,
    webhookSecret: env.PJK_WEBHOOK_SECRET!,
  };
}
