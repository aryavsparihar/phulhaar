import {useCallback, useMemo, useState} from 'react';
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
  belongsTo,
  dimensionsOf,
  SALE_LABELS,
  saleStateOf,
  namesOf,
  numberOf,
  type ArtworkCardData,
} from '~/lib/catalogue';
import {parseEnv} from '~/lib/env.server';
import {
  artworkJsonLd,
  enquiryMailto,
  jsonForScript,
  type ArtworkFacts,
} from '~/lib/artwork-page';
import {
  Lightbox,
  RecentlyViewed,
  RoomView,
  ShareButton,
} from '~/components/ArtworkViewers';

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
    {tagName: 'link', rel: 'canonical', href: data.canonicalUrl},
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

  // The canonical address: the configured site, or this request's own origin before it is set.
  const config = parseEnv(context.env);
  const origin = (
    config.PHULHAAR_SITE_URL ?? new URL(request.url).origin
  ).replace(/\/$/, '');
  const canonicalUrl = `${origin}/products/${product.handle}`;

  // More by the same artist (the admin sets vendor to the artist's name), then the gallery's
  // other works to fill the row. Both at once, and neither can fail the page.
  const owner = artistOf(product);
  const others = (nodes: unknown[]) =>
    (nodes as ArtworkCardData[]).filter(
      (p) => p.id !== product.id && isArtwork(p),
    );
  const [byArtist, gallery] = await Promise.all([
    owner.name
      ? storefront
          .query(RELATED_QUERY, {
            variables: {
              first: 12,
              query: `vendor:"${owner.name.replace(/"/g, '')}"`,
            },
          })
          .then(({products}) =>
            others(products.nodes).filter((p) => belongsTo(p, owner)),
          )
          .catch(() => [] as ArtworkCardData[])
      : Promise.resolve([] as ArtworkCardData[]),
    storefront
      .query(RELATED_QUERY, {variables: {first: 12, query: null}})
      .then(({products}) => others(products.nodes))
      .catch(() => [] as ArtworkCardData[]),
  ]);
  const moreByArtist = byArtist.slice(0, 4);
  const taken = new Set(moreByArtist.map((p) => p.id));
  const fill = gallery
    .filter((p) => !taken.has(p.id))
    .slice(0, Math.max(0, 4 - moreByArtist.length));

  return {product, canonicalUrl, moreByArtist, fill};
}

export default function Artwork() {
  const {product, canonicalUrl, moreByArtist, fill} =
    useLoaderData<typeof loader>();
  const root = useRouteLoaderData<RootLoader>('root');
  const {open} = useAside();

  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  const images = product.images.nodes;
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [room, setRoom] = useState(false);
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const closeRoom = useCallback(() => setRoom(false), []);
  const image = images[current] ?? selectedVariant?.image;

  const artist = artistOf(product);
  const dimensions = dimensionsOf(product);
  const mediums = namesOf(product.mediums);
  const traditions = namesOf(product.traditions);
  const surface =
    product.surface?.reference && 'field' in product.surface.reference
      ? product.surface.reference.field?.value
      : null;
  const state = saleStateOf({
    availability: product.availability,
    availableForSale: selectedVariant?.availableForSale ?? false,
    price: selectedVariant?.price.amount,
  });
  // Bought online only when it is really for sale at a real price.
  const buyable = state === 'available' && !!selectedVariant;
  const enquiryEmail = root?.enquiryEmail ?? 'hello@pjk.co.in';
  const heightCm = numberOf(product.heightCm) ?? null;
  const widthCm = numberOf(product.widthCm) ?? null;
  const facts: ArtworkFacts = {
    title: product.title,
    url: canonicalUrl,
    artist: artist.name,
    year: product.year?.value ?? null,
    medium: mediums.join(', ') || product.productType || null,
    surface: surface ?? null,
    dimensions,
    heightCm,
    widthCm,
    depthCm: numberOf(product.depthCm) ?? null,
    description: product.description || null,
    images: images.map((img) => img.url),
    price: selectedVariant?.price ?? null,
    state,
  };
  const enquiry = enquiryMailto(enquiryEmail, facts);
  const recent = useMemo(
    () => ({
      handle: product.handle,
      title: product.title,
      artist: artist.name,
      image: images[0]?.url ?? null,
    }),
    [product.handle, product.title, artist.name, images],
  );

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
              <button
                type="button"
                className="artwork-open"
                onClick={() => setLightbox(images[current] ? current : null)}
                aria-label="View full screen"
                disabled={!images[current]}
              >
                <Image
                  data={image}
                  alt={image.altText || product.title}
                  sizes="(min-width: 60em) 55vw, 100vw"
                  loading="eager"
                />
              </button>
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
          {heightCm && widthCm ? (
            <button
              type="button"
              className="link-arrow artwork-room-link"
              onClick={() => setRoom(true)}
            >
              View in a room
            </button>
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
            {buyable ? (
              <Money data={selectedVariant.price} withoutTrailingZeros />
            ) : (
              <span className={`art-card-state art-card-${state}`}>
                {state === 'available'
                  ? SALE_LABELS.price_on_request
                  : SALE_LABELS[state]}
              </span>
            )}
          </div>

          {/* Release 1 is enquiry-first: a conversation with the gallery is the main way to buy. */}
          <div className="artwork-actions">
            <a className="btn btn-block" href={enquiry}>
              {state === 'sold'
                ? `Ask about similar works${artist.name ? ` by ${artist.name}` : ''}`
                : state === 'price_on_request'
                  ? 'Ask for the price'
                  : 'Enquire about this work'}
            </a>
            {buyable ? (
              <div className="artwork-buy">
                <AddToCartButton
                  lines={lines}
                  redirectTo="__checkout"
                  className="btn btn-quiet btn-block"
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
              </div>
            ) : null}
            <ShareButton title={product.title} url={canonicalUrl} />
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

      {moreByArtist.length > 0 ? (
        <section className="section" style={{paddingTop: 0}}>
          <div className="section-head">
            <h2>More by {artist.name}</h2>
            {artist.handle ? (
              <Link className="link-arrow" to={`/artists/${artist.handle}`}>
                All their work
              </Link>
            ) : null}
          </div>
          <ArtworkGrid products={moreByArtist} eager={0} />
        </section>
      ) : null}

      {fill.length > 0 ? (
        <section className="section" style={{paddingTop: 0}}>
          <div className="section-head">
            <h2>
              {moreByArtist.length
                ? 'More from the gallery'
                : 'You may also like'}
            </h2>
            <Link className="link-arrow" to="/collections/all">
              All artworks
            </Link>
          </div>
          <ArtworkGrid products={fill} eager={0} />
        </section>
      ) : null}

      <RecentlyViewed work={recent} />

      <Lightbox
        images={images}
        index={lightbox}
        title={product.title}
        onIndex={(index) => {
          setLightbox(index);
          setCurrent(index);
        }}
        onClose={closeLightbox}
      />
      {heightCm && widthCm ? (
        <RoomView
          open={room}
          onClose={closeRoom}
          image={images[0] ?? null}
          title={product.title}
          heightCm={heightCm}
          widthCm={widthCm}
        />
      ) : null}

      <script
        type="application/ld+json"
        // Escaped for a script element by jsonForScript; the data is the store's own.
        dangerouslySetInnerHTML={{__html: jsonForScript(artworkJsonLd(facts))}}
      />

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
      availability: metafield(namespace: "phulhaar", key: "availability") { value }
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
  query RelatedArtworks($country: CountryCode, $language: LanguageCode, $query: String, $first: Int!)
  @inContext(country: $country, language: $language) {
    products(first: $first, query: $query, sortKey: BEST_SELLING) {
      nodes { ...ArtworkCard }
    }
  }
  ${ARTWORK_CARD_FRAGMENT}
` as const;
