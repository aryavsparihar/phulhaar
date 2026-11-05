import {Link} from 'react-router';
import type {Route} from './+types/traditions';
import {CATEGORIES, TRADITIONS} from '~/lib/gallery';

export const meta: Route.MetaFunction = () => [
  {title: 'Traditions — Phulhaar Gallery'},
];

export default function Traditions() {
  return (
    <div className="wrap">
      <header className="page-head">
        <p className="eyebrow">The living traditions</p>
        <h1>Traditions and forms</h1>
        <p className="lede">
          The named traditions of India, each from the region and the families
          that keep it, beside contemporary painting, sculpture and textile.
        </p>
      </header>
      <hr className="gold-rule" style={{marginBottom: '2rem'}} />
      <div className="tiles">
        {TRADITIONS.map((tradition) => (
          <Link
            key={tradition.name}
            className="tile"
            to={`/collections/all?q=${encodeURIComponent(tradition.name)}`}
          >
            <span className="tile-name">{tradition.name}</span>
            <span className="tile-note">{tradition.region}</span>
          </Link>
        ))}
      </div>

      <section className="section">
        <h2>By form</h2>
        <div className="chips">
          {CATEGORIES.map((category) => (
            <Link
              key={category}
              className="chip"
              to={`/collections/all?q=${encodeURIComponent(category)}`}
            >
              {category}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
