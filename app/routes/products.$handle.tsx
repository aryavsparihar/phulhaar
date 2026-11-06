import {useState} from 'react';
import {Link, useLoaderData, useRouteLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {
  Analytics,
  getSelectedProductOptions,
  Image,
  Money,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import type {RootLoader} from '~/root';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ArtworkGrid} from '~/components/ArtworkCard';
import {useAside} from '~/components/Aside';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {
  isArtwork,
  ARTWORK_CARD_FRAGMENT,
  artistOf,
  dimensionsOf,
  namesOf,
  type ArtworkCardData,
} from '~/lib/catalogue';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data) return [{title: 'Phulhaar Gallery'}];
  const {product} = data;
  const artist = artistOf(product).name;
  return [
    {
      title: `${product.title}${artist ? ` by ${artist}` : ''} — Phulhaar Gallery`,
    },
    {
      name: 'description',
      content: product.seo?.description || product.description.slice(0, 160),
    },
    {rel: 'canonical', href: `/products/${product.handle}`},
  ];
};

export async function loader({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) throw new Response(null, {status: 404});

  const {product} = await storefront.query(ARTWORK_QUERY, {
    variables: {handle, selectedOptions: getSelectedProductOptions(request)},
  });

  if (!product?.id || !isArtwork(product))
    throw new Response(null, {status: 404});

  redirectIfHandleIsLocalized(request, {handle, data: product});

  // More by the same artist, then anything else, without blocking the page.
  const artistName = artistOf(product).name;
  const related = storefront
    .query(RELATED_QUERY, {
      variables: {
        query: artistName ? `vendor:"${artistName.replace(/"/g, '')}"` : null,
      },
    })
    .then(({products}) =>
      (products.nodes as ArtworkCardData[])
        .filter((p) => p.id !== product.id && isArtwork(p))
        .slice(0, 4),
    )
    .catch(() => [] as ArtworkCardData[]);

  return {product, related: await related};
}

export default function Artwork() {
  const {product, related} = useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');
  const {open} = useAside();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const images = product.images.nodes;
  const [current, setCurrent] = useState(0);
  const image = images[current] ?? selectedVariant?.image;

  const artist = artistOf(product);
  const dimensions = dimensionsOf(product);
  const mediums = namesOf(product.mediums);
  const traditions = namesOf(product.traditions);
  const surface =
    product.surface?.reference && 'field' in product.surface.reference
      ? product.surface.reference.field?.value
      : null;
  const available = !!selectedVariant?.availableForSale;
  const enquiryEmail = root?.enquiryEmail ?? 'hello@pjk.co.in';
  const enquiry = `mailto:${enquiryEmail}?subject=${encodeURIComponent(
    `Enquiry: ${product.title}${artist.name ? ` by ${artist.name}` : ''}`,
  )}&body=${encodeURIComponent(
    `I would like to know more about this work:\n${product.title}\n\n`,
  )}`;

  const lines = selectedVariant
    ? [{merchandiseId: selectedVariant.id, quantity: 1, selectedVariant}]
    : [];

  const details: Array<[string, string | null | undefined]> = [
    ['Artist', artist.name],
    ['Year', product.year?.value],
    ['Medium', mediums.join(', ') || product.productType],
    ['Surface', surface],
    ['Tradition', traditions.join(', ')],
    ['Size', dimensions],
    ['Signed', boolean(product.signed?.value, 'Signed by the artist')],
    [
      'Framed',
      product.framed?.value === 'true'
        ? product.frameDetails?.value || 'Framed'
        : boolean(product.framed?.value, null, 'Unframed'),
    ],
    [
      'Certificate',
      boolean(product.hasCertificate?.value, 'Certificate of authenticity'),
    ],
    ['Ships as', product.shipsAs?.value],
  ];

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/collections/all">Artworks</Link>
        {artist.name ? (
          <>
            <span>/</span>
            {artist.handle ? (
              <Link to={`/artists/${artist.handle}`}>{artist.name}</Link>
            ) : (
              <span style={{margin: 0}}>{artist.name}</span>
            )}
          </>
        ) : null}
      </nav>

      <div className="artwork">
        <div>
          <div className="artwork-stage">
            {image ? (
              <a
                href={image.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the full-size image"
              >
                <Image
                  data={image}
                  alt={image.altText || product.title}
                  sizes="(min-width: 60em) 55vw, 100vw"
                  loading="eager"
                />
              </a>
            ) : (
              <span className="muted">Image to follow</span>
            )}
          </div>
          {images.length > 1 ? (
            <div className="artwork-thumbs">
              {images.map((thumb, index) => (
                <button
                  key={thumb.id}
                  type="button"
                  aria-current={index === current}
                  aria-label={`View image ${index + 1}`}
                  onClick={() => setCurrent(index)}
                >
                  <Image
                    data={thumb}
                    alt=""
                    width={72}
                    height={72}
                    crop="center"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="artwork-label">
          <h1>{product.title}</h1>
          {artist.name ? (
            <p className="artwork-artist">
              {artist.handle ? (
                <Link to={`/artists/${artist.handle}`}>{artist.name}</Link>
              ) : (
                artist.name
              )}
            </p>
          ) : null}
          <p className="artwork-place">
            {[mediums.join(', ') || product.productType, product.year?.value]
              .filter(Boolean)
              .join(', ')}
            {dimensions ? (
              <>
                <br />
                {dimensions}
              </>
            ) : null}
          </p>
          <hr className="gold-rule" />

          <div className="artwork-price">
            {available && selectedVariant ? (
              <Money data={selectedVariant.price} withoutTrailingZeros />
            ) : (
              <span className="art-card-sold">Sold</span>
            )}
          </div>

          <div className="artwork-actions">
            {available ? (
              <>
                <AddToCartButton
                  lines={lines}
                  redirectTo="__checkout"
                  className="btn btn-block"
                >
                  Buy now
                </AddToCartButton>
                <AddToCartButton
                  lines={lines}
                  onClick={() => open('cart')}
                  className="btn btn-quiet btn-block"
                >
                  Add to cart
                </AddToCartButton>
              </>
            ) : null}
            <a className="btn btn-quiet btn-block" href={enquiry}>
              Enquire about this work
            </a>
          </div>

          <dl className="details">
            {details
              .filter(([, value]) => !!value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>

          {product.artistNote?.value ? (
            <div className="artwork-note">
              <p className="eyebrow">From the artist</p>
              <blockquote>{product.artistNote.value}</blockquote>
            </div>
          ) : null}

          {product.descriptionHtml ? (
            <div
              className="prose"
              style={{marginTop: '2rem'}}
              dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
            />
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="section" style={{paddingTop: 0}}>
          <div className="section-head">
            <h2>
              {artist.name ? `More from the gallery` : 'You may also like'}
            </h2>
            <Link className="link-arrow" to="/collections/all">
              All artworks
            </Link>
          </div>
          <ArtworkGrid products={related} eager={0} />
        </section>
      ) : null}

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </div>
  );
}

/** "true"/"false" metafield → words, or nothing when it was never set. */
function boolean(
  value: string | null | undefined,
  yes: string | null,
  no: string | null = null,
) {
  if (value === 'true') return yes;
  if (value === 'false') return no;
  return null;
}

const VARIANT_FRAGMENT = `#graphql
  fragment ArtworkVariant on ProductVariant {
    availableForSale
    compareAtPrice { amount currencyCode }
    id
    image { __typename id url altText width height }
    price { amount currencyCode }
    product { title handle }
    selectedOptions { name value }
    sku
    title
    unitPrice { amount currencyCode }
  }
` as const;

const ARTWORK_QUERY = `#graphql
  query Artwork(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      vendor
      handle
      productType
      descriptionHtml
      description
      encodedVariantExistence
      encodedVariantAvailability
      images(first: 8) {
        nodes { id url altText width height }
      }
      options {
        name
        optionValues {
          name
          firstSelectableVariant { ...ArtworkVariant }
          swatch { color image { previewImage { url } } }
        }
      }
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
        ...ArtworkVariant
      }
      adjacentVariants(selectedOptions: $selectedOptions) { ...ArtworkVariant }
      seo { description title }
      artist: metafield(namespace: "phulhaar", key: "artist") {
        reference {
          ... on Metaobject {
            handle
            displayName: field(key: "display_name") { value }
          }
        }
      }
      year: metafield(namespace: "phulhaar", key: "year") { value }
      heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }
      widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }
      depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }
      mediums: metafield(namespace: "phulhaar", key: "mediums") {
        references(first: 5) { nodes { ... on Metaobject { field(key: "name") { value } } } }
      }
      traditions: metafield(namespace: "phulhaar", key: "traditions") {
        references(first: 5) { nodes { ... on Metaobject { field(key: "name") { value } } } }
      }
      surface: metafield(namespace: "phulhaar", key: "surface") {
        reference { ... on Metaobject { field(key: "name") { value } } }
      }
      artistNote: metafield(namespace: "phulhaar", key: "artist_note") { value }
      signed: metafield(namespace: "phulhaar", key: "signed") { value }
      framed: metafield(namespace: "phulhaar", key: "framed") { value }
      frameDetails: metafield(namespace: "phulhaar", key: "frame_details") { value }
      hasCertificate: metafield(namespace: "phulhaar", key: "has_certificate") { value }
      shipsAs: metafield(namespace: "phulhaar", key: "ships_as") { value }
    }
  }
  ${VARIANT_FRAGMENT}
` as const;

const RELATED_QUERY = `#graphql
  query RelatedArtworks($country: CountryCode, $language: LanguageCode, $query: String)
  @inContext(country: $country, language: $language) {
    products(first: 5, query: $query, sortKey: BEST_SELLING) {
      nodes { ...ArtworkCard }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
