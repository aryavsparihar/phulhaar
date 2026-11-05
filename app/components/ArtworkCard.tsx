import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {
  artistOf,
  captionOf,
  dimensionsOf,
  type ArtworkCardData,
} from '~/lib/catalogue';

export function ArtworkCard({
  product,
  loading,
}: {
  product: ArtworkCardData;
  loading?: 'eager' | 'lazy';
}) {
  const image = product.featuredImage;
  const artist = artistOf(product);
  const caption = captionOf(product);
  const dimensions = dimensionsOf(product);

  return (
    <Link
      className="art-card"
      prefetch="intent"
      to={`/products/${product.handle}`}
    >
      <div className="art-card-frame">
        {image ? (
          <Image
            alt={
              image.altText ||
              `${product.title}${artist.name ? `, by ${artist.name}` : ''}`
            }
            data={image}
            loading={loading}
            sizes="(min-width: 75em) 22vw, (min-width: 48em) 30vw, 46vw"
          />
        ) : (
          <span className="muted">Image to follow</span>
        )}
      </div>
      <p className="art-card-title">{product.title}</p>
      {artist.name ? <p className="art-card-artist">{artist.name}</p> : null}
      {caption || dimensions ? (
        <p className="art-card-meta">
          {[caption, dimensions].filter(Boolean).join(' · ')}
        </p>
      ) : null}
      <div className="art-card-price">
        {product.availableForSale === false ? (
          <span className="art-card-sold">Sold</span>
        ) : (
          <Money
            data={product.priceRange.minVariantPrice}
            withoutTrailingZeros
          />
        )}
      </div>
    </Link>
  );
}

export function ArtworkGrid({
  products,
  eager = 4,
}: {
  products: ArtworkCardData[];
  eager?: number;
}) {
  if (products.length === 0) {
    return (
      <div className="empty">
        <h3>No works here yet</h3>
        <p className="muted">
          New work is being hung. Look at everything in the gallery instead.
        </p>
        <Link className="link-arrow" to="/collections/all">
          All artworks
        </Link>
      </div>
    );
  }
  return (
    <div className="art-grid">
      {products.map((product, index) => (
        <ArtworkCard
          key={product.id}
          product={product}
          loading={index < eager ? 'eager' : 'lazy'}
        />
      ))}
    </div>
  );
}
