import {useLoaderData, useRouteLoaderData} from 'react-router';
import type {Route} from './+types/visit';
import type {RootLoader} from '~/root';
import {parseEnv} from '~/lib/env.server';
import {galleryJsonLd, jsonForScript} from '~/lib/artwork-page';

export const meta: Route.MetaFunction = () => [
  {title: 'Visit and contact — Phulhaar Gallery'},
];

export function loader({context, request}: Route.LoaderArgs) {
  const origin = (
    parseEnv(context.env).PHULHAAR_SITE_URL ?? new URL(request.url).origin
  ).replace(/\/$/, '');
  return {origin};
}

export default function Visit() {
  const {origin} = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');
  const email = root?.enquiryEmail ?? 'hello@pjk.co.in';
  const settings = root?.settings;

  return (
    <div className="wrap">
      <div className="section feature">
        <div>
          <p className="eyebrow">Visit and contact</p>
          <h1>Phulhaar Gallery</h1>
          <p className="lede">
            Come and see the work as it is meant to be seen, on the wall and in
            the light.
          </p>
          <hr className="gold-rule" style={{margin: '1.5rem 0'}} />

          <h3>Where</h3>
          {settings?.address.length ? (
            <>
              <p>
                {settings.address.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
                {settings.mapUrl ? (
                  <a
                    className="link-arrow"
                    href={settings.mapUrl}
                    rel="noopener"
                  >
                    Open in maps
                  </a>
                ) : null}
              </p>
            </>
          ) : (
            <p className="gallery-note">
              The gallery opens on 8 November 2026, and its address will be
              given here. Until then, visits and private viewings are by
              appointment: write to <a href={`mailto:${email}`}>{email}</a>.
            </p>
          )}

          <h3>When</h3>
          {settings?.hours.length ? (
            <>
              <p>
                {settings.hours.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </>
          ) : (
            <p className="gallery-note">
              Opening hours follow the opening on 8 November 2026. Viewings are
              by appointment at a time that suits you; the online gallery is
              open all the time.
            </p>
          )}

          <h3>Write to us</h3>
          <p>
            About a work, a commission, a visit or anything else:{' '}
            <a href={`mailto:${email}`}>{email}</a>
            {settings?.phone ? (
              <>
                {' '}
                or{' '}
                <a href={`tel:${settings.phone.replace(/\s+/g, '')}`}>
                  {settings.phone}
                </a>
              </>
            ) : null}
            . A person reads every message.
          </p>
        </div>
        <img
          className="feature-mark"
          src="/brand/phulhaar-logo.png"
          alt="Phulhaar Gallery"
          width="280"
          height="215"
        />
      </div>
      <script
        type="application/ld+json"
        // Escaped for a script element by jsonForScript; the data is the store's own.
        dangerouslySetInnerHTML={{
          __html: jsonForScript(
            galleryJsonLd({
              url: origin,
              email,
              phone: settings?.phone ?? null,
              address: settings?.address ?? [],
              mapUrl: settings?.mapUrl ?? null,
              logo: `${origin}/brand/phulhaar-logo.png`,
            }),
          ),
        }}
      />
    </div>
  );
}
