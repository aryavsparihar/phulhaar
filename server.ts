import * as serverBuild from 'virtual:react-router/server-build';
import {createRequestHandler, storefrontRedirect} from '@shopify/hydrogen';
import {createHydrogenRouterContext} from '~/lib/context';

const GATE_COOKIE = 'phulhaar_gate';

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

async function gateToken(password: string, secret: string): Promise<string> {
  const data = new TextEncoder().encode(`phulhaar-gate:${secret}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function passwordPage(wrong = false): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Phulhaar Gallery — Password</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #FBF4E5;
      color: #023118;
      font-family: Georgia, serif;
      padding: 1.5rem;
    }
    main {
      max-width: 24rem;
      width: 100%;
      background: #F5EAD3;
      border: 1px solid rgba(2, 49, 24, 0.18);
      padding: 2.25rem 2rem;
      box-sizing: border-box;
      text-align: center;
    }
    h1 {
      font-weight: 400;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-size: 1.35rem;
      margin: 0 0 0.5rem;
    }
    p {
      margin: 0 0 1.5rem;
      font-size: 0.98rem;
      color: rgba(2, 49, 24, 0.78);
    }
    form {
      display: grid;
      gap: 0.75rem;
    }
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.7rem 0.85rem;
      border: 1px solid rgba(2, 49, 24, 0.35);
      background: #FBF4E5;
      color: #023118;
      font-family: inherit;
      font-size: 1rem;
    }
    button {
      padding: 0.75rem 1rem;
      border: 1px solid #023118;
      background: #023118;
      color: #FBF4E5;
      font-family: inherit;
      font-size: 0.95rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .err {
      color: #C6014B;
      margin-bottom: 1rem;
      font-size: 0.92rem;
    }
  </style>
</head>
<body>
  <main>
    <h1>Phulhaar Gallery</h1>
    <p>Enter the password to view the gallery.</p>
    ${wrong ? '<div class="err" role="alert">Incorrect password.</div>' : ''}
    <form method="post">
      <input type="password" name="site_password" placeholder="Password" required autofocus />
      <button type="submit">Enter</button>
    </form>
  </main>
</body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      const configuredPassword = (
        env as unknown as Record<string, string | undefined>
      ).SITE_PASSWORD?.trim();

      if (configuredPassword) {
        const expected = await gateToken(
          configuredPassword,
          env.SESSION_SECRET ?? 'phulhaar',
        );
        const current = readCookie(request.headers.get('Cookie'), GATE_COOKIE);

        if (current !== expected) {
          if (request.method === 'POST') {
            const form = await request
              .clone()
              .formData()
              .catch(() => null);
            const submitted = String(form?.get('site_password') ?? '').trim();
            if (submitted && submitted === configuredPassword) {
              return new Response(null, {
                status: 303,
                headers: {
                  Location: new URL(request.url).pathname || '/',
                  'Set-Cookie': `${GATE_COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
                },
              });
            }
            return passwordPage(true);
          }
          return passwordPage(false);
        }
      }

      const hydrogenContext = await createHydrogenRouterContext(
        request,
        env,
        executionContext,
      );

      /**
       * Create a Hydrogen request handler that internally
       * delegates to React Router for routing and rendering.
       */
      const handleRequest = createRequestHandler({
        build: serverBuild,
        mode: process.env.NODE_ENV,
        getLoadContext: () => hydrogenContext,
      });

      const response = await handleRequest(request);

      if (hydrogenContext.session.isPending) {
        response.headers.set(
          'Set-Cookie',
          await hydrogenContext.session.commit(),
        );
      }

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};
