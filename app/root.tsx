import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Link,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {parseEnv} from '~/lib/env.server';
import {gallerySettings} from '~/lib/gallery-settings.server';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import {PageLayout} from './components/PageLayout';

export type RootLoader = typeof loader;

/** Root data is fetched once; only mutations (cart, sign-in) refresh it. */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  if (formMethod && formMethod !== 'GET') return true;
  if (currentUrl.toString() === nextUrl.toString()) return true;
  return false;
};

const PRELOADED_FONTS = [
  'marcellus-latin-400-normal',
  'eb-garamond-latin-400-normal',
  'cormorant-garamond-latin-400-italic',
];

export function links() {
  return [
    {rel: 'preconnect', href: 'https://cdn.shopify.com'},
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
    ...PRELOADED_FONTS.map((font) => ({
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: `/fonts/${font}.woff2`,
      crossOrigin: 'anonymous' as const,
    })),
  ];
}

export const meta: Route.MetaFunction = () => [
  {title: 'Phulhaar Gallery by PAT and J.K. Co.'},
  {
    name: 'description',
    content:
      'Original work by Indian artists — Madhubani, Pichwai, Gond, Warli, Pattachitra, painting, sculpture and textile. Phulhaar Gallery by PAT and J.K. Co.',
  },
  {name: 'theme-color', content: '#FBF4E5'},
];

export async function loader({context}: Route.LoaderArgs) {
  const {storefront, env, cart} = context;
  const config = parseEnv(env);
  const settings = await gallerySettings(storefront);

  return {
    cart: cart.get(),
    settings,
    enquiryEmail: config.PHULHAAR_ENQUIRY_EMAIL ?? 'hello@pjk.co.in',
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();

  return (
    <html lang="en-IN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout
        cart={data.cart}
        enquiryEmail={data.enquiryEmail}
        announcement={data.settings.announcement}
      >
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const notFound = status === 404;

  return (
    <div className="route-error">
      <img
        src="/brand/phulhaar-garland.webp"
        alt=""
        width="96"
        style={{margin: '0 auto 1.5rem', width: 96}}
      />
      <p className="eyebrow">{status}</p>
      <h1>
        {notFound ? 'This page is not on the wall' : 'Something went wrong'}
      </h1>
      <p className="lede">
        {notFound
          ? 'The work may have been sold or moved.'
          : 'Please try again in a moment.'}
      </p>
      <p>
        <Link className="btn" to="/collections/all">
          See all artworks
        </Link>
      </p>
    </div>
  );
}
