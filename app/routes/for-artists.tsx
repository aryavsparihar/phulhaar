import {Link} from 'react-router';
import type {Route} from './+types/for-artists';
import {GALLERY} from '~/lib/gallery';

export const meta: Route.MetaFunction = () => [
  {title: 'For artists — Phulhaar Gallery'},
];

export default function ForArtists() {
  return (
    <div className="wrap">
      <div className="section feature">
        <div>
          <p className="eyebrow">For artists</p>
          <h1>Show your work at Phulhaar</h1>
          <p className="lede">
            Phulhaar is the gallery of PAT and J.K. Co. Artists join through PJK
            once, and then sign in here with the Artist ID PJK gives them.
          </p>
          <ol className="steps">
            <li>
              <strong>Apply on PJK.</strong> Tell PJK about yourself and your
              practice. Your identity and payment details stay with PJK, never
              with Phulhaar.
            </li>
            <li>
              <strong>Get your Artist ID.</strong> Once you are approved, PJK
              sends you an Artist ID such as AT000123.
            </li>
            <li>
              <strong>Sign in to the studio.</strong> Enter your Artist ID here
              and the one-time code PJK emails you. No password to remember.
            </li>
            <li>
              <strong>Share your work.</strong> Gallery staff review each work
              before it goes on the wall.
            </li>
          </ol>
          <div className="hero-actions">
            <Link className="btn" to="/studio">
              Artist sign-in
            </Link>
            <a
              className="btn btn-quiet"
              href={GALLERY.pjkOnboardingUrl}
              rel="noopener"
            >
              Apply on PJK
            </a>
          </div>
        </div>
        <img
          className="feature-mark"
          src="/brand/phulhaar-garland.webp"
          alt=""
          width="280"
          height="422"
        />
      </div>
    </div>
  );
}
