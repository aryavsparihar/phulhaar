import {useEffect, useRef, useState} from 'react';
import {Link, useFetcher, useNavigate} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {useAside} from '~/components/Aside';

interface Results {
  q: string;
  works: Array<{
    handle: string;
    title: string;
    artist: string | null;
    image: string | null;
    price: MoneyV2;
    snippet: string | null;
  }>;
  artists: Array<{handle: string; name: string; place: string}>;
}

/** Search as you type, from the first two letters, through the gallery's own search engine. */
export function SearchPanel() {
  const fetcher = useFetcher<Results>();
  const navigate = useNavigate();
  const {close} = useAside();
  const [q, setQ] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) return;
    timer.current = setTimeout(() => {
      void fetcher.load(`/api/search?q=${encodeURIComponent(q.trim())}`);
    }, 140);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const data = q.trim().length >= 2 ? fetcher.data : undefined;
  const go = () => {
    if (!q.trim()) return;
    close();
    void navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="predictive-search">
      <form
        className="predictive-search-form"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go();
        }}
      >
        <input
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Peacock, indigo, Sita Devi, wedding"
          aria-label="Search the gallery"
          autoComplete="off"
        />
        <button className="btn" type="submit">
          Search
        </button>
      </form>

      {q.trim().length < 2 ? (
        <p className="muted">
          Type anything you remember about a work: a colour, a creature, a
          festival, a word from its story, the artist&rsquo;s name. Spelling
          does not have to be right.
        </p>
      ) : fetcher.state === 'loading' && !data ? (
        <p className="muted">Searching</p>
      ) : data && data.works.length + data.artists.length === 0 ? (
        <p className="muted">
          Nothing matches “{q}” yet. Try one word from the work.
        </p>
      ) : data ? (
        <>
          {data.artists.length ? (
            <div className="predictive-search-result">
              <h5>Artists</h5>
              {data.artists.map((artist) => (
                <div
                  key={artist.handle}
                  className="predictive-search-result-item"
                >
                  <Link to={`/artists/${artist.handle}`} onClick={close}>
                    <span>
                      <strong>{artist.name}</strong>
                      <br />
                      <small className="muted">{artist.place}</small>
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
          {data.works.length ? (
            <div className="predictive-search-result">
              <h5>Artworks</h5>
              {data.works.map((work) => (
                <div
                  key={work.handle}
                  className="predictive-search-result-item"
                >
                  <Link to={`/products/${work.handle}`} onClick={close}>
                    {work.image ? (
                      <img
                        src={`${work.image}${work.image.includes('?') ? '&' : '?'}width=112`}
                        alt=""
                        width={56}
                        height={56}
                      />
                    ) : null}
                    <span>
                      <em>{work.title}</em>
                      {work.artist ? (
                        <small className="muted"> · {work.artist}</small>
                      ) : null}
                      <br />
                      {work.snippet ? (
                        <small className="snippet">{work.snippet}</small>
                      ) : (
                        <small>
                          <Money data={work.price} withoutTrailingZeros />
                        </small>
                      )}
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          ) : null}
          <button className="reset link-arrow" type="button" onClick={go}>
            Every result for “{q}”
          </button>
        </>
      ) : null}
    </div>
  );
}
