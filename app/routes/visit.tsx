import {useRouteLoaderData} from 'react-router';
import type {Route} from './+types/visit';
import type {RootLoader} from '~/root';

export const meta: Route.MetaFunction = () => [
  {title: 'Visit and contact — Phulhaar Gallery'},
];

export default function Visit() {
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

          {settings?.address.length ? (
            <>
              <h3>Where</h3>
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
          ) : null}

          {settings?.hours.length ? (
            <>
              <h3>When</h3>
              <p>
                {settings.hours.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </>
          ) : null}

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
    </div>
  );
}
