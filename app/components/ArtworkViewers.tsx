import {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {
  addRecent,
  parseRecent,
  RECENT_KEY,
  roomLayout,
  type RecentWork,
} from '~/lib/artwork-page';

export interface ViewerImage {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

/** A modal <dialog> that opens with showModal and reports when the visitor closes it. */
function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // Escape and the close button both end here, so React's state never disagrees with the page.
    const handle = () => onClose();
    dialog.addEventListener('close', handle);
    return () => dialog.removeEventListener('close', handle);
  }, [onClose]);
  return ref;
}

/** Full-screen images: click to zoom where you clicked, arrows to move, Escape to close. */
export function Lightbox({
  images,
  index,
  title,
  onIndex,
  onClose,
}: {
  images: ViewerImage[];
  /** The image shown, or null when closed. */
  index: number | null;
  title: string;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const open = index !== null;
  const ref = useDialog(open, onClose);
  const [zoom, setZoom] = useState<{x: number; y: number} | null>(null);
  const count = images.length;
  const current = index ?? 0;
  const image = images[current];

  const go = useCallback(
    (step: number) => {
      if (count < 2) return;
      setZoom(null);
      onIndex((current + step + count) % count);
    },
    [count, current, onIndex],
  );

  useEffect(() => setZoom(null), [index]);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label={`${title}, image ${current + 1} of ${count}`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(1);
        if (event.key === 'ArrowLeft') go(-1);
      }}
    >
      {open && image ? (
        <>
          <div className="lightbox-bar">
            <span className="muted">
              {count > 1 ? `${current + 1} / ${count}` : null}
            </span>
            <span className="lightbox-hint muted">
              {zoom ? 'Click to zoom out' : 'Click the image to zoom'}
            </span>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => onClose()}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className={`lightbox-stage${zoom ? ' is-zoomed' : ''}`}>
            <button
              type="button"
              className="lightbox-image"
              aria-label={zoom ? 'Zoom out' : 'Zoom in'}
              onClick={(event) => {
                if (zoom) return setZoom(null);
                const box = event.currentTarget.getBoundingClientRect();
                setZoom({
                  x: ((event.clientX - box.left) / box.width) * 100,
                  y: ((event.clientY - box.top) / box.height) * 100,
                });
              }}
            >
              <img
                src={image.url}
                alt={image.altText || title}
                width={image.width ?? undefined}
                height={image.height ?? undefined}
                style={
                  zoom
                    ? {
                        transform: 'scale(2.5)',
                        transformOrigin: `${zoom.x}% ${zoom.y}%`,
                      }
                    : undefined
                }
              />
            </button>
            {count > 1 ? (
              <>
                <button
                  type="button"
                  className="lightbox-nav lightbox-prev"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="lightbox-nav lightbox-next"
                  onClick={() => go(1)}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </dialog>
  );
}

/** The work at its true size on a gallery wall, with a bench and a person for scale. */
export function RoomView({
  open,
  onClose,
  image,
  title,
  heightCm,
  widthCm,
}: {
  open: boolean;
  onClose: () => void;
  image: ViewerImage | null;
  title: string;
  heightCm: number;
  widthCm: number;
}) {
  const ref = useDialog(open, onClose);
  const room = roomLayout(heightCm, widthCm);
  const {wall, art, bench, person} = room;
  const floor = wall.height;
  const label = (cm: number) => `${Math.round(cm * 10) / 10} cm`;
  const headR = 11;
  const px = person.x;
  const top = floor - person.height;

  return (
    <dialog ref={ref} className="room-dialog" aria-labelledby="room-title">
      {open ? (
        <>
          <div className="lightbox-bar">
            <h2 id="room-title" className="room-title">
              View in a room
            </h2>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => onClose()}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <svg
            className="room"
            viewBox={`-6 -6 ${wall.width + 12} ${wall.height + 26}`}
            role="img"
            aria-label={`${title}, ${label(heightCm)} high and ${label(widthCm)} wide, on a ${wall.width / 100} m wall beside a 1.7 m figure`}
          >
            <rect
              x="0"
              y="0"
              width={wall.width}
              height={wall.height}
              fill="#FBF4E5"
            />
            <rect
              x="0"
              y={floor - 6}
              width={wall.width}
              height="6"
              fill="#EDE3CF"
            />
            <line
              x1="0"
              y1={floor}
              x2={wall.width}
              y2={floor}
              stroke="#C9B99A"
              strokeWidth="0.8"
            />

            {/* The work, with a soft shadow as if hung a little off the wall. */}
            <rect
              x={art.x + 1.2}
              y={art.y + 1.8}
              width={art.width}
              height={art.height}
              fill="rgba(40,30,20,0.18)"
            />
            {image ? (
              <image
                href={image.url}
                x={art.x}
                y={art.y}
                width={art.width}
                height={art.height}
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <rect
                x={art.x}
                y={art.y}
                width={art.width}
                height={art.height}
                fill="#d8cbb0"
              />
            )}
            <rect
              x={art.x}
              y={art.y}
              width={art.width}
              height={art.height}
              fill="none"
              stroke="rgba(0,0,0,0.25)"
              strokeWidth="0.4"
            />

            {/* Dimension callouts. */}
            <g className="room-dim">
              <line
                x1={art.x}
                y1={art.y - 7}
                x2={art.x + art.width}
                y2={art.y - 7}
              />
              <line x1={art.x} y1={art.y - 10} x2={art.x} y2={art.y - 4} />
              <line
                x1={art.x + art.width}
                y1={art.y - 10}
                x2={art.x + art.width}
                y2={art.y - 4}
              />
              <text
                x={art.x + art.width / 2}
                y={art.y - 10}
                textAnchor="middle"
              >
                {label(widthCm)}
              </text>
              <line
                x1={art.x + art.width + 7}
                y1={art.y}
                x2={art.x + art.width + 7}
                y2={art.y + art.height}
              />
              <line
                x1={art.x + art.width + 4}
                y1={art.y}
                x2={art.x + art.width + 10}
                y2={art.y}
              />
              <line
                x1={art.x + art.width + 4}
                y1={art.y + art.height}
                x2={art.x + art.width + 10}
                y2={art.y + art.height}
              />
              <text
                x={art.x + art.width + 12}
                y={art.y + art.height / 2}
                dominantBaseline="middle"
              >
                {label(heightCm)}
              </text>
            </g>

            {/* A gallery bench. */}
            <g fill="#8B6F4E">
              <rect
                x={bench.x}
                y={bench.y}
                width={bench.width}
                height="5"
                rx="1"
              />
              <rect
                x={bench.x + 6}
                y={bench.y + 5}
                width="4"
                height={bench.height - 5}
              />
              <rect
                x={bench.x + bench.width - 10}
                y={bench.y + 5}
                width="4"
                height={bench.height - 5}
              />
            </g>

            {/* A 1.7 m figure. */}
            <g fill="#B9AC95">
              <circle cx={px} cy={top + headR} r={headR} />
              <path
                d={`M${px - 19} ${top + 2 * headR + 6}
                    Q${px} ${top + 2 * headR - 2} ${px + 19} ${top + 2 * headR + 6}
                    L${px + 15} ${top + 95}
                    L${px + 10} ${floor}
                    L${px + 2} ${floor}
                    L${px} ${top + 100}
                    L${px - 2} ${floor}
                    L${px - 10} ${floor}
                    L${px - 15} ${top + 95} Z`}
              />
            </g>
            <text
              className="room-note"
              x={px}
              y={floor + 14}
              textAnchor="middle"
            >
              1.7 m
            </text>
            <text
              className="room-note"
              x={wall.width}
              y={floor + 14}
              textAnchor="end"
            >
              Wall {wall.width / 100} × {wall.height / 100} m, drawn to scale
            </text>
          </svg>
        </>
      ) : null}
    </dialog>
  );
}

/** The system share sheet where there is one; otherwise the link is copied. */
export function ShareButton({title, url}: {title: string; url: string}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  const share = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({title, url});
        return;
      } catch (error) {
        // The visitor closed the sheet: nothing to do.
        if ((error as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button
      type="button"
      className="btn btn-quiet btn-block"
      onClick={() => void share()}
    >
      <span aria-live="polite">
        {state === 'copied'
          ? 'Link copied'
          : state === 'failed'
            ? 'Could not copy the link'
            : 'Share'}
      </span>
    </button>
  );
}

function readRecent(): RecentWork[] {
  try {
    return parseRecent(window.localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

/** Records this work and shows the others the visitor looked at, from this browser only. */
export function RecentlyViewed({work}: {work: RecentWork}) {
  const [items, setItems] = useState<RecentWork[]>([]);
  useEffect(() => {
    const list = readRecent();
    setItems(list.filter((item) => item.handle !== work.handle).slice(0, 6));
    try {
      window.localStorage.setItem(
        RECENT_KEY,
        JSON.stringify(addRecent(list, work)),
      );
    } catch {
      // Storage can be full or switched off; the row simply does not appear.
    }
  }, [work]);

  if (!items.length) return null;
  return (
    <section className="section recent" style={{paddingTop: 0}}>
      <div className="section-head">
        <h2>Recently viewed</h2>
      </div>
      <ul className="recent-list">
        {items.map((item) => (
          <li key={item.handle}>
            <Link to={`/products/${item.handle}`} prefetch="intent">
              {item.image ? (
                <img
                  src={`${item.image}${item.image.includes('?') ? '&' : '?'}width=240`}
                  alt=""
                  loading="lazy"
                  width="120"
                  height="120"
                />
              ) : (
                <span className="recent-blank" aria-hidden="true" />
              )}
              <strong>{item.title}</strong>
              {item.artist ? (
                <span className="muted">{item.artist}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
