import {useRouteLoaderData} from 'react-router';
import type {Route} from './+types/visit';
import type {RootLoader} from '~/root';
import {GALLERY} from '~/lib/gallery';

export const meta: Route.MetaFunction = () => [
  {title: 'Visit and contact — Phulhaar Gallery'},
];

export default function Visit() {
  const root = useRouteLoaderData<RootLoader>('root');
  const email = root?.enquiryEmail ?? 'hello@phulhaargallery.com';

  return (
    <div className="wrap">
      <div className="section feature">
        <div>
          <p className="eyebrow">Visit the gallery</p>
          <h1>Opening on {GALLERY.openingLabel}</h1>
          <p className="lede">
            Come and see the work as it is meant to be seen, on the wall and in
            the light.
          </p>
          <hr className="gold-rule" style={{margin: '1.5rem 0'}} />

          <h3>Where</h3>
          {GALLERY.address ? (
            <p>
              {GALLERY.address.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          ) : (
            <p>The address will be published here before the opening.</p>
          )}

          <h3>When</h3>
          {GALLERY.hours ? (
            <p>
              {GALLERY.hours.map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </p>
          ) : (
            <p>Opening hours will be published here before the opening.</p>
          )}

          <h3>Write to us</h3>
          <p>
            About a work, a commission, a visit or anything else:{' '}
            <a href={`mailto:${email}`}>{email}</a>. A person reads every
            message.
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
