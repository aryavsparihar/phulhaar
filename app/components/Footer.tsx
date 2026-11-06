import {Link} from 'react-router';
import {GALLERY} from '~/lib/gallery';

export function Footer({enquiryEmail}: {enquiryEmail: string}) {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <img src="/brand/phulhaar-wordmark.svg" alt="Phulhaar" />
          <p className="muted">
            An online gallery for Indian artists, and the studio where they
            manage their own work. A venture of PAT and J.K. Co.
          </p>
        </div>
        <div>
          <h4>The gallery</h4>
          <ul>
            <li>
              <Link to="/collections/all">All artworks</Link>
            </li>
            <li>
              <Link to="/artists">Artists</Link>
            </li>
            <li>
              <Link to="/visit">Visit and contact</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Artists</h4>
          <ul>
            <li>
              <Link to="/for-artists">Show your work</Link>
            </li>
            <li>
              <Link to="/studio">Artist sign-in</Link>
            </li>
            <li>
              <a href={GALLERY.pjkOnboardingUrl} rel="noopener">
                Apply on PJK
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li>
              <a href={`mailto:${enquiryEmail}`}>{enquiryEmail}</a>
            </li>
            <li>
              <Link to="/policies">Policies</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-base">
        <span>
          © {year} PAT and J.K. Co. Artwork images belong to the artists who
          made them.
        </span>
        <span>Secure checkout through Shopify</span>
      </div>
    </footer>
  );
}
