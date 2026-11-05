/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as StorefrontAPI from '@shopify/hydrogen/storefront-api-types';

export type ArtworkCardFragment = Pick<
  StorefrontAPI.Product,
  'id' | 'handle' | 'title' | 'vendor' | 'productType' | 'availableForSale'
> & {
  featuredImage?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  priceRange: {
    minVariantPrice: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  };
  artist?: StorefrontAPI.Maybe<{
    reference?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Metaobject, 'handle'> & {
        displayName?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        artistId?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
      }
    >;
  }>;
  year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
  mediums?: StorefrontAPI.Maybe<{
    references?: StorefrontAPI.Maybe<{
      nodes: Array<{
        field?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
      }>;
    }>;
  }>;
};

export type MoneyFragment = Pick<
  StorefrontAPI.MoneyV2,
  'currencyCode' | 'amount'
>;

export type CartLineFragment = Pick<
  StorefrontAPI.CartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
  parentRelationship?: StorefrontAPI.Maybe<{
    parent: Pick<StorefrontAPI.CartLine, 'id'>;
  }>;
};

export type CartLineComponentFragment = Pick<
  StorefrontAPI.ComponentizableCartLine,
  'id' | 'quantity'
> & {
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  cost: {
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    amountPerQuantity: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  merchandise: Pick<
    StorefrontAPI.ProductVariant,
    'id' | 'availableForSale' | 'requiresShipping' | 'title'
  > & {
    compareAtPrice?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    image?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
    >;
    product: Pick<StorefrontAPI.Product, 'handle' | 'title' | 'id' | 'vendor'>;
    selectedOptions: Array<
      Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
    >;
  };
  lineComponents: Array<
    Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
      attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
      cost: {
        totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        amountPerQuantity: Pick<
          StorefrontAPI.MoneyV2,
          'currencyCode' | 'amount'
        >;
        compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
      };
      merchandise: Pick<
        StorefrontAPI.ProductVariant,
        'id' | 'availableForSale' | 'requiresShipping' | 'title'
      > & {
        compareAtPrice?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
        >;
        price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
        product: Pick<
          StorefrontAPI.Product,
          'handle' | 'title' | 'id' | 'vendor'
        >;
        selectedOptions: Array<
          Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
        >;
      };
      parentRelationship?: StorefrontAPI.Maybe<{
        parent: Pick<StorefrontAPI.CartLine, 'id'>;
      }>;
    }
  >;
};

export type CartApiQueryFragment = Pick<
  StorefrontAPI.Cart,
  'updatedAt' | 'id' | 'checkoutUrl' | 'totalQuantity' | 'note'
> & {
  appliedGiftCards: Array<
    Pick<StorefrontAPI.AppliedGiftCard, 'id' | 'lastCharacters'> & {
      amountUsed: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    }
  >;
  buyerIdentity: Pick<
    StorefrontAPI.CartBuyerIdentity,
    'countryCode' | 'email' | 'phone'
  > & {
    customer?: StorefrontAPI.Maybe<
      Pick<
        StorefrontAPI.Customer,
        'id' | 'email' | 'firstName' | 'lastName' | 'displayName'
      >
    >;
  };
  lines: {
    nodes: Array<
      | (Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
          parentRelationship?: StorefrontAPI.Maybe<{
            parent: Pick<StorefrontAPI.CartLine, 'id'>;
          }>;
        })
      | (Pick<StorefrontAPI.ComponentizableCartLine, 'id' | 'quantity'> & {
          attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
          cost: {
            totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            amountPerQuantity: Pick<
              StorefrontAPI.MoneyV2,
              'currencyCode' | 'amount'
            >;
            compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
          };
          merchandise: Pick<
            StorefrontAPI.ProductVariant,
            'id' | 'availableForSale' | 'requiresShipping' | 'title'
          > & {
            compareAtPrice?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
            >;
            price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'url' | 'altText' | 'width' | 'height'
              >
            >;
            product: Pick<
              StorefrontAPI.Product,
              'handle' | 'title' | 'id' | 'vendor'
            >;
            selectedOptions: Array<
              Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
            >;
          };
          lineComponents: Array<
            Pick<StorefrontAPI.CartLine, 'id' | 'quantity'> & {
              attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
              cost: {
                totalAmount: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
                amountPerQuantity: Pick<
                  StorefrontAPI.MoneyV2,
                  'currencyCode' | 'amount'
                >;
                compareAtAmountPerQuantity?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
              };
              merchandise: Pick<
                StorefrontAPI.ProductVariant,
                'id' | 'availableForSale' | 'requiresShipping' | 'title'
              > & {
                compareAtPrice?: StorefrontAPI.Maybe<
                  Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
                >;
                price: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
                image?: StorefrontAPI.Maybe<
                  Pick<
                    StorefrontAPI.Image,
                    'id' | 'url' | 'altText' | 'width' | 'height'
                  >
                >;
                product: Pick<
                  StorefrontAPI.Product,
                  'handle' | 'title' | 'id' | 'vendor'
                >;
                selectedOptions: Array<
                  Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                >;
              };
              parentRelationship?: StorefrontAPI.Maybe<{
                parent: Pick<StorefrontAPI.CartLine, 'id'>;
              }>;
            }
          >;
        })
    >;
  };
  cost: {
    subtotalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalAmount: Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>;
    totalDutyAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
    totalTaxAmount?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MoneyV2, 'currencyCode' | 'amount'>
    >;
  };
  attributes: Array<Pick<StorefrontAPI.Attribute, 'key' | 'value'>>;
  discountCodes: Array<
    Pick<StorefrontAPI.CartDiscountCode, 'code' | 'applicable'>
  >;
};

export type MenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ChildMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
>;

export type ParentMenuItemFragment = Pick<
  StorefrontAPI.MenuItem,
  'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    >
  >;
};

export type MenuFragment = Pick<StorefrontAPI.Menu, 'id'> & {
  items: Array<
    Pick<
      StorefrontAPI.MenuItem,
      'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
    > & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        >
      >;
    }
  >;
};

export type ShopFragment = Pick<
  StorefrontAPI.Shop,
  'id' | 'name' | 'description'
> & {
  primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
  brand?: StorefrontAPI.Maybe<{
    logo?: StorefrontAPI.Maybe<{
      image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
    }>;
  }>;
};

export type HeaderQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  headerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type HeaderQuery = {
  shop: Pick<StorefrontAPI.Shop, 'id' | 'name' | 'description'> & {
    primaryDomain: Pick<StorefrontAPI.Domain, 'url'>;
    brand?: StorefrontAPI.Maybe<{
      logo?: StorefrontAPI.Maybe<{
        image?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Image, 'url'>>;
      }>;
    }>;
  };
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type FooterQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  footerMenuHandle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type FooterQuery = {
  menu?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Menu, 'id'> & {
      items: Array<
        Pick<
          StorefrontAPI.MenuItem,
          'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
        > & {
          items: Array<
            Pick<
              StorefrontAPI.MenuItem,
              'id' | 'resourceId' | 'tags' | 'title' | 'type' | 'url'
            >
          >;
        }
      >;
    }
  >;
};

export type GallerySettingsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type GallerySettingsQuery = {
  metaobject?: StorefrontAPI.Maybe<{
    address?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    hours?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    mapUrl?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    phone?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
    announcement?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.MetaobjectField, 'value'>
    >;
  }>;
};

export type SearchCorpusQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  after?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
}>;

export type SearchCorpusQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'description'
        | 'tags'
        | 'id'
        | 'handle'
        | 'title'
        | 'vendor'
        | 'productType'
        | 'availableForSale'
      > & {
        traditions?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
        styles?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
        subjects?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
        colours?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
        surface?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            field?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
        category?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            field?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
        note?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        city?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        artist?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'handle'> & {
              displayName?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              artistId?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }
          >;
        }>;
        year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        mediums?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
      }
    >;
    pageInfo: Pick<StorefrontAPI.PageInfo, 'hasNextPage' | 'endCursor'>;
  };
};

export type SearchArtistsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type SearchArtistsQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'handle'> & {
        displayName?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        city?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        biography?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        statement?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        state?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            field?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
      }
    >;
  };
};

export type HomeArtworksQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first: StorefrontAPI.Scalars['Int']['input'];
  sortKey: StorefrontAPI.ProductSortKeys;
  reverse: StorefrontAPI.Scalars['Boolean']['input'];
}>;

export type HomeArtworksQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'vendor'
        | 'productType'
        | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        artist?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'handle'> & {
              displayName?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              artistId?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }
          >;
        }>;
        year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        mediums?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
      }
    >;
  };
};

export type ArtistQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  handle: StorefrontAPI.MetaobjectHandleInput;
}>;

export type ArtistQuery = {
  metaobject?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Metaobject, 'handle'> & {
      displayName?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
      artistId?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
      biography?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
      statement?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
      city?: StorefrontAPI.Maybe<Pick<StorefrontAPI.MetaobjectField, 'value'>>;
      verified?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.MetaobjectField, 'value'>
      >;
      state?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<{
          field?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'value'>
          >;
        }>;
      }>;
      portrait?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<{
          image?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
          >;
        }>;
      }>;
    }
  >;
};

export type ArtistWorksQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
}>;

export type ArtistWorksQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'vendor'
        | 'productType'
        | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        artist?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'handle'> & {
              displayName?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              artistId?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }
          >;
        }>;
        year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        mediums?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
      }
    >;
  };
};

export type ArtistsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ArtistsQuery = {
  metaobjects: {
    nodes: Array<
      Pick<StorefrontAPI.Metaobject, 'handle'> & {
        displayName?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        city?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.MetaobjectField, 'value'>
        >;
        state?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            field?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
        portrait?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<{
            image?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Image, 'url' | 'altText' | 'width' | 'height'>
            >;
          }>;
        }>;
      }
    >;
  };
};

export type ArticleQueryVariables = StorefrontAPI.Exact<{
  articleHandle: StorefrontAPI.Scalars['String']['input'];
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type ArticleQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'handle'> & {
      articleByHandle?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.Article,
          'handle' | 'title' | 'contentHtml' | 'publishedAt'
        > & {
          author?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.ArticleAuthor, 'name'>
          >;
          image?: StorefrontAPI.Maybe<
            Pick<
              StorefrontAPI.Image,
              'id' | 'altText' | 'url' | 'width' | 'height'
            >
          >;
          seo?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Seo, 'description' | 'title'>
          >;
        }
      >;
    }
  >;
};

export type BlogQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  blogHandle: StorefrontAPI.Scalars['String']['input'];
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type BlogQuery = {
  blog?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Blog, 'title' | 'handle'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'title' | 'description'>
      >;
      articles: {
        nodes: Array<
          Pick<
            StorefrontAPI.Article,
            'contentHtml' | 'handle' | 'id' | 'publishedAt' | 'title'
          > & {
            author?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.ArticleAuthor, 'name'>
            >;
            image?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'altText' | 'url' | 'width' | 'height'
              >
            >;
            blog: Pick<StorefrontAPI.Blog, 'handle'>;
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'endCursor' | 'startCursor'
        >;
      };
    }
  >;
};

export type ArticleItemFragment = Pick<
  StorefrontAPI.Article,
  'contentHtml' | 'handle' | 'id' | 'publishedAt' | 'title'
> & {
  author?: StorefrontAPI.Maybe<Pick<StorefrontAPI.ArticleAuthor, 'name'>>;
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'altText' | 'url' | 'width' | 'height'>
  >;
  blog: Pick<StorefrontAPI.Blog, 'handle'>;
};

export type BlogsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type BlogsQuery = {
  blogs: {
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
    nodes: Array<
      Pick<StorefrontAPI.Blog, 'title' | 'handle'> & {
        seo?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Seo, 'title' | 'description'>
        >;
      }
    >;
  };
};

export type ArtworkCollectionQueryVariables = StorefrontAPI.Exact<{
  handle: StorefrontAPI.Scalars['String']['input'];
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type ArtworkCollectionQuery = {
  collection?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Collection,
      'id' | 'handle' | 'title' | 'description'
    > & {
      products: {
        nodes: Array<
          Pick<
            StorefrontAPI.Product,
            | 'id'
            | 'handle'
            | 'title'
            | 'vendor'
            | 'productType'
            | 'availableForSale'
          > & {
            featuredImage?: StorefrontAPI.Maybe<
              Pick<
                StorefrontAPI.Image,
                'id' | 'altText' | 'url' | 'width' | 'height'
              >
            >;
            priceRange: {
              minVariantPrice: Pick<
                StorefrontAPI.MoneyV2,
                'amount' | 'currencyCode'
              >;
            };
            artist?: StorefrontAPI.Maybe<{
              reference?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.Metaobject, 'handle'> & {
                  displayName?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                  artistId?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                }
              >;
            }>;
            year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
            heightCm?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            widthCm?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            depthCm?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.Metafield, 'value'>
            >;
            mediums?: StorefrontAPI.Maybe<{
              references?: StorefrontAPI.Maybe<{
                nodes: Array<{
                  field?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MetaobjectField, 'value'>
                  >;
                }>;
              }>;
            }>;
          }
        >;
        pageInfo: Pick<
          StorefrontAPI.PageInfo,
          'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
        >;
      };
    }
  >;
};

export type CollectionFragment = Pick<
  StorefrontAPI.Collection,
  'id' | 'title' | 'handle'
> & {
  image?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Image, 'id' | 'url' | 'altText' | 'width' | 'height'>
  >;
};

export type StoreCollectionsQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
}>;

export type StoreCollectionsQuery = {
  collections: {
    nodes: Array<
      Pick<StorefrontAPI.Collection, 'id' | 'title' | 'handle'> & {
        image?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type CatalogueQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  first?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  last?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Int']['input']>;
  startCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  endCursor?: StorefrontAPI.InputMaybe<
    StorefrontAPI.Scalars['String']['input']
  >;
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
  sortKey?: StorefrontAPI.InputMaybe<StorefrontAPI.ProductSortKeys>;
  reverse?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['Boolean']['input']>;
}>;

export type CatalogueQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'vendor'
        | 'productType'
        | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        artist?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'handle'> & {
              displayName?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              artistId?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }
          >;
        }>;
        year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        mediums?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
      }
    >;
    pageInfo: Pick<
      StorefrontAPI.PageInfo,
      'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'
    >;
  };
};

export type PageQueryVariables = StorefrontAPI.Exact<{
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
}>;

export type PageQuery = {
  page?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.Page, 'handle' | 'id' | 'title' | 'body'> & {
      seo?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Seo, 'description' | 'title'>
      >;
    }
  >;
};

export type PolicyFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'body' | 'handle' | 'id' | 'title' | 'url'
>;

export type PolicyQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  privacyPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  refundPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  shippingPolicy: StorefrontAPI.Scalars['Boolean']['input'];
  termsOfService: StorefrontAPI.Scalars['Boolean']['input'];
}>;

export type PolicyQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'body' | 'handle' | 'id' | 'title' | 'url'>
    >;
  };
};

export type PolicyItemFragment = Pick<
  StorefrontAPI.ShopPolicy,
  'id' | 'title' | 'handle'
>;

export type PoliciesQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
}>;

export type PoliciesQuery = {
  shop: {
    privacyPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    shippingPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    termsOfService?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    refundPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicy, 'id' | 'title' | 'handle'>
    >;
    subscriptionPolicy?: StorefrontAPI.Maybe<
      Pick<StorefrontAPI.ShopPolicyWithDefault, 'id' | 'title' | 'handle'>
    >;
  };
};

export type ArtworkVariantFragment = Pick<
  StorefrontAPI.ProductVariant,
  'availableForSale' | 'id' | 'sku' | 'title'
> & {
  compareAtPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
  image?: StorefrontAPI.Maybe<
    {__typename: 'Image'} & Pick<
      StorefrontAPI.Image,
      'id' | 'url' | 'altText' | 'width' | 'height'
    >
  >;
  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
  selectedOptions: Array<Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>>;
  unitPrice?: StorefrontAPI.Maybe<
    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
  >;
};

export type ArtworkQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  handle: StorefrontAPI.Scalars['String']['input'];
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  selectedOptions:
    | Array<StorefrontAPI.SelectedOptionInput>
    | StorefrontAPI.SelectedOptionInput;
}>;

export type ArtworkQuery = {
  product?: StorefrontAPI.Maybe<
    Pick<
      StorefrontAPI.Product,
      | 'id'
      | 'title'
      | 'vendor'
      | 'handle'
      | 'productType'
      | 'descriptionHtml'
      | 'description'
      | 'encodedVariantExistence'
      | 'encodedVariantAvailability'
    > & {
      images: {
        nodes: Array<
          Pick<
            StorefrontAPI.Image,
            'id' | 'url' | 'altText' | 'width' | 'height'
          >
        >;
      };
      options: Array<
        Pick<StorefrontAPI.ProductOption, 'name'> & {
          optionValues: Array<
            Pick<StorefrontAPI.ProductOptionValue, 'name'> & {
              firstSelectableVariant?: StorefrontAPI.Maybe<
                Pick<
                  StorefrontAPI.ProductVariant,
                  'availableForSale' | 'id' | 'sku' | 'title'
                > & {
                  compareAtPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                  image?: StorefrontAPI.Maybe<
                    {__typename: 'Image'} & Pick<
                      StorefrontAPI.Image,
                      'id' | 'url' | 'altText' | 'width' | 'height'
                    >
                  >;
                  price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
                  product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
                  selectedOptions: Array<
                    Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
                  >;
                  unitPrice?: StorefrontAPI.Maybe<
                    Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
                  >;
                }
              >;
              swatch?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.ProductOptionValueSwatch, 'color'> & {
                  image?: StorefrontAPI.Maybe<{
                    previewImage?: StorefrontAPI.Maybe<
                      Pick<StorefrontAPI.Image, 'url'>
                    >;
                  }>;
                }
              >;
            }
          >;
        }
      >;
      selectedOrFirstAvailableVariant?: StorefrontAPI.Maybe<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      adjacentVariants: Array<
        Pick<
          StorefrontAPI.ProductVariant,
          'availableForSale' | 'id' | 'sku' | 'title'
        > & {
          compareAtPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
          image?: StorefrontAPI.Maybe<
            {__typename: 'Image'} & Pick<
              StorefrontAPI.Image,
              'id' | 'url' | 'altText' | 'width' | 'height'
            >
          >;
          price: Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>;
          product: Pick<StorefrontAPI.Product, 'title' | 'handle'>;
          selectedOptions: Array<
            Pick<StorefrontAPI.SelectedOption, 'name' | 'value'>
          >;
          unitPrice?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MoneyV2, 'amount' | 'currencyCode'>
          >;
        }
      >;
      seo: Pick<StorefrontAPI.Seo, 'description' | 'title'>;
      artist?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<
          Pick<StorefrontAPI.Metaobject, 'handle'> & {
            displayName?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }
        >;
      }>;
      year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      mediums?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<{
            field?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
      }>;
      traditions?: StorefrontAPI.Maybe<{
        references?: StorefrontAPI.Maybe<{
          nodes: Array<{
            field?: StorefrontAPI.Maybe<
              Pick<StorefrontAPI.MetaobjectField, 'value'>
            >;
          }>;
        }>;
      }>;
      surface?: StorefrontAPI.Maybe<{
        reference?: StorefrontAPI.Maybe<{
          field?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.MetaobjectField, 'value'>
          >;
        }>;
      }>;
      artistNote?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      signed?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      framed?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
      frameDetails?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      hasCertificate?: StorefrontAPI.Maybe<
        Pick<StorefrontAPI.Metafield, 'value'>
      >;
      shipsAs?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
    }
  >;
};

export type RelatedArtworksQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
}>;

export type RelatedArtworksQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'vendor'
        | 'productType'
        | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        artist?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'handle'> & {
              displayName?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              artistId?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }
          >;
        }>;
        year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        mediums?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
      }
    >;
  };
};

export type StudioWorksQueryVariables = StorefrontAPI.Exact<{
  country?: StorefrontAPI.InputMaybe<StorefrontAPI.CountryCode>;
  language?: StorefrontAPI.InputMaybe<StorefrontAPI.LanguageCode>;
  query?: StorefrontAPI.InputMaybe<StorefrontAPI.Scalars['String']['input']>;
}>;

export type StudioWorksQuery = {
  products: {
    nodes: Array<
      Pick<
        StorefrontAPI.Product,
        | 'id'
        | 'handle'
        | 'title'
        | 'vendor'
        | 'productType'
        | 'availableForSale'
      > & {
        featuredImage?: StorefrontAPI.Maybe<
          Pick<
            StorefrontAPI.Image,
            'id' | 'altText' | 'url' | 'width' | 'height'
          >
        >;
        priceRange: {
          minVariantPrice: Pick<
            StorefrontAPI.MoneyV2,
            'amount' | 'currencyCode'
          >;
        };
        artist?: StorefrontAPI.Maybe<{
          reference?: StorefrontAPI.Maybe<
            Pick<StorefrontAPI.Metaobject, 'handle'> & {
              displayName?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
              artistId?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }
          >;
        }>;
        year?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        heightCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        widthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        depthCm?: StorefrontAPI.Maybe<Pick<StorefrontAPI.Metafield, 'value'>>;
        mediums?: StorefrontAPI.Maybe<{
          references?: StorefrontAPI.Maybe<{
            nodes: Array<{
              field?: StorefrontAPI.Maybe<
                Pick<StorefrontAPI.MetaobjectField, 'value'>
              >;
            }>;
          }>;
        }>;
      }
    >;
  };
};

interface GeneratedQueryTypes {
  '#graphql\n  fragment Shop on Shop {\n    id\n    name\n    description\n    primaryDomain {\n      url\n    }\n    brand {\n      logo {\n        image {\n          url\n        }\n      }\n    }\n  }\n  query Header(\n    $country: CountryCode\n    $headerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      ...Shop\n    }\n    menu(handle: $headerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: HeaderQuery;
    variables: HeaderQueryVariables;
  };
  '#graphql\n  query Footer(\n    $country: CountryCode\n    $footerMenuHandle: String!\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    menu(handle: $footerMenuHandle) {\n      ...Menu\n    }\n  }\n  #graphql\n  fragment MenuItem on MenuItem {\n    id\n    resourceId\n    tags\n    title\n    type\n    url\n  }\n  fragment ChildMenuItem on MenuItem {\n    ...MenuItem\n  }\n  fragment ParentMenuItem on MenuItem {\n    ...MenuItem\n    items {\n      ...ChildMenuItem\n    }\n  }\n  fragment Menu on Menu {\n    id\n    items {\n      ...ParentMenuItem\n    }\n  }\n\n': {
    return: FooterQuery;
    variables: FooterQueryVariables;
  };
  '#graphql\n  query GallerySettings($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    metaobject(handle: {type: "phulhaar_gallery", handle: "settings"}) {\n      address: field(key: "address") { value }\n      hours: field(key: "hours") { value }\n      mapUrl: field(key: "map_url") { value }\n      phone: field(key: "phone") { value }\n      announcement: field(key: "announcement") { value }\n    }\n  }\n': {
    return: GallerySettingsQuery;
    variables: GallerySettingsQueryVariables;
  };
  '#graphql\n  query SearchCorpus($country: CountryCode, $language: LanguageCode, $after: String)\n  @inContext(country: $country, language: $language) {\n    products(first: 250, after: $after) {\n      nodes {\n        ...ArtworkCard\n        description\n        tags\n        traditions: metafield(namespace: "phulhaar", key: "traditions") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }\n        styles: metafield(namespace: "phulhaar", key: "styles") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }\n        subjects: metafield(namespace: "phulhaar", key: "subjects") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }\n        colours: metafield(namespace: "phulhaar", key: "colours") { references(first: 10) { nodes { ... on Metaobject { field(key: "name") { value } } } } }\n        surface: metafield(namespace: "phulhaar", key: "surface") { reference { ... on Metaobject { field(key: "name") { value } } } }\n        category: metafield(namespace: "phulhaar", key: "category") { reference { ... on Metaobject { field(key: "name") { value } } } }\n        note: metafield(namespace: "phulhaar", key: "artist_note") { value }\n        city: metafield(namespace: "phulhaar", key: "ships_from_city") { value }\n      }\n      pageInfo { hasNextPage endCursor }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: SearchCorpusQuery;
    variables: SearchCorpusQueryVariables;
  };
  '#graphql\n  query SearchArtists($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    metaobjects(type: "phulhaar_artist", first: 250) {\n      nodes {\n        handle\n        displayName: field(key: "display_name") { value }\n        city: field(key: "city") { value }\n        biography: field(key: "biography") { value }\n        statement: field(key: "statement") { value }\n        state: field(key: "state") { reference { ... on Metaobject { field(key: "name") { value } } } }\n      }\n    }\n  }\n': {
    return: SearchArtistsQuery;
    variables: SearchArtistsQueryVariables;
  };
  '#graphql\n  query HomeArtworks(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int!\n    $sortKey: ProductSortKeys!\n    $reverse: Boolean!\n  ) @inContext(country: $country, language: $language) {\n    products(first: $first, sortKey: $sortKey, reverse: $reverse) {\n      nodes {\n        ...ArtworkCard\n      }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: HomeArtworksQuery;
    variables: HomeArtworksQueryVariables;
  };
  '#graphql\n  query Artist(\n    $country: CountryCode\n    $language: LanguageCode\n    $handle: MetaobjectHandleInput!\n  ) @inContext(country: $country, language: $language) {\n    metaobject(handle: $handle) {\n      handle\n      displayName: field(key: "display_name") { value }\n      artistId: field(key: "artist_id") { value }\n      biography: field(key: "biography") { value }\n      statement: field(key: "statement") { value }\n      city: field(key: "city") { value }\n      verified: field(key: "pjk_verified") { value }\n      state: field(key: "state") {\n        reference { ... on Metaobject { field(key: "name") { value } } }\n      }\n      portrait: field(key: "portrait") {\n        reference { ... on MediaImage { image { url altText width height } } }\n      }\n    }\n  }\n': {
    return: ArtistQuery;
    variables: ArtistQueryVariables;
  };
  '#graphql\n  query ArtistWorks($country: CountryCode, $language: LanguageCode, $query: String)\n  @inContext(country: $country, language: $language) {\n    products(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {\n      nodes { ...ArtworkCard }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: ArtistWorksQuery;
    variables: ArtistWorksQueryVariables;
  };
  '#graphql\n  query Artists($country: CountryCode, $language: LanguageCode)\n  @inContext(country: $country, language: $language) {\n    metaobjects(type: "phulhaar_artist", first: 250) {\n      nodes {\n        handle\n        displayName: field(key: "display_name") { value }\n        city: field(key: "city") { value }\n        state: field(key: "state") {\n          reference { ... on Metaobject { field(key: "name") { value } } }\n        }\n        portrait: field(key: "portrait") {\n          reference {\n            ... on MediaImage { image { url altText width height } }\n          }\n        }\n      }\n    }\n  }\n': {
    return: ArtistsQuery;
    variables: ArtistsQueryVariables;
  };
  '#graphql\n  query Article(\n    $articleHandle: String!\n    $blogHandle: String!\n    $country: CountryCode\n    $language: LanguageCode\n  ) @inContext(language: $language, country: $country) {\n    blog(handle: $blogHandle) {\n      handle\n      articleByHandle(handle: $articleHandle) {\n        handle\n        title\n        contentHtml\n        publishedAt\n        author: authorV2 {\n          name\n        }\n        image {\n          id\n          altText\n          url\n          width\n          height\n        }\n        seo {\n          description\n          title\n        }\n      }\n    }\n  }\n': {
    return: ArticleQuery;
    variables: ArticleQueryVariables;
  };
  '#graphql\n  query Blog(\n    $language: LanguageCode\n    $blogHandle: String!\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(language: $language) {\n    blog(handle: $blogHandle) {\n      title\n      handle\n      seo {\n        title\n        description\n      }\n      articles(\n        first: $first,\n        last: $last,\n        before: $startCursor,\n        after: $endCursor\n      ) {\n        nodes {\n          ...ArticleItem\n        }\n        pageInfo {\n          hasPreviousPage\n          hasNextPage\n          hasNextPage\n          endCursor\n          startCursor\n        }\n\n      }\n    }\n  }\n  fragment ArticleItem on Article {\n    author: authorV2 {\n      name\n    }\n    contentHtml\n    handle\n    id\n    image {\n      id\n      altText\n      url\n      width\n      height\n    }\n    publishedAt\n    title\n    blog {\n      handle\n    }\n  }\n': {
    return: BlogQuery;
    variables: BlogQueryVariables;
  };
  '#graphql\n  query Blogs(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    blogs(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor\n    ) {\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n      nodes {\n        title\n        handle\n        seo {\n          title\n          description\n        }\n      }\n    }\n  }\n': {
    return: BlogsQuery;
    variables: BlogsQueryVariables;
  };
  '#graphql\n  query ArtworkCollection(\n    $handle: String!\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collection(handle: $handle) {\n      id\n      handle\n      title\n      description\n      products(first: $first, last: $last, before: $startCursor, after: $endCursor) {\n        nodes { ...ArtworkCard }\n        pageInfo { hasPreviousPage hasNextPage startCursor endCursor }\n      }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: ArtworkCollectionQuery;
    variables: ArtworkCollectionQueryVariables;
  };
  '#graphql\n  fragment Collection on Collection {\n    id\n    title\n    handle\n    image {\n      id\n      url\n      altText\n      width\n      height\n    }\n  }\n  query StoreCollections(\n    $country: CountryCode\n    $endCursor: String\n    $first: Int\n    $language: LanguageCode\n    $last: Int\n    $startCursor: String\n  ) @inContext(country: $country, language: $language) {\n    collections(\n      first: $first,\n      last: $last,\n      before: $startCursor,\n      after: $endCursor\n    ) {\n      nodes {\n        ...Collection\n      }\n      pageInfo {\n        hasNextPage\n        hasPreviousPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n': {
    return: StoreCollectionsQuery;
    variables: StoreCollectionsQueryVariables;
  };
  '#graphql\n  query Catalogue(\n    $country: CountryCode\n    $language: LanguageCode\n    $first: Int\n    $last: Int\n    $startCursor: String\n    $endCursor: String\n    $query: String\n    $sortKey: ProductSortKeys\n    $reverse: Boolean\n  ) @inContext(country: $country, language: $language) {\n    products(\n      first: $first\n      last: $last\n      before: $startCursor\n      after: $endCursor\n      query: $query\n      sortKey: $sortKey\n      reverse: $reverse\n    ) {\n      nodes {\n        ...ArtworkCard\n      }\n      pageInfo {\n        hasPreviousPage\n        hasNextPage\n        startCursor\n        endCursor\n      }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: CatalogueQuery;
    variables: CatalogueQueryVariables;
  };
  '#graphql\n  query Page(\n    $language: LanguageCode,\n    $country: CountryCode,\n    $handle: String!\n  )\n  @inContext(language: $language, country: $country) {\n    page(handle: $handle) {\n      handle\n      id\n      title\n      body\n      seo {\n        description\n        title\n      }\n    }\n  }\n': {
    return: PageQuery;
    variables: PageQueryVariables;
  };
  '#graphql\n  fragment Policy on ShopPolicy {\n    body\n    handle\n    id\n    title\n    url\n  }\n  query Policy(\n    $country: CountryCode\n    $language: LanguageCode\n    $privacyPolicy: Boolean!\n    $refundPolicy: Boolean!\n    $shippingPolicy: Boolean!\n    $termsOfService: Boolean!\n  ) @inContext(language: $language, country: $country) {\n    shop {\n      privacyPolicy @include(if: $privacyPolicy) {\n        ...Policy\n      }\n      shippingPolicy @include(if: $shippingPolicy) {\n        ...Policy\n      }\n      termsOfService @include(if: $termsOfService) {\n        ...Policy\n      }\n      refundPolicy @include(if: $refundPolicy) {\n        ...Policy\n      }\n    }\n  }\n': {
    return: PolicyQuery;
    variables: PolicyQueryVariables;
  };
  '#graphql\n  fragment PolicyItem on ShopPolicy {\n    id\n    title\n    handle\n  }\n  query Policies ($country: CountryCode, $language: LanguageCode)\n    @inContext(country: $country, language: $language) {\n    shop {\n      privacyPolicy {\n        ...PolicyItem\n      }\n      shippingPolicy {\n        ...PolicyItem\n      }\n      termsOfService {\n        ...PolicyItem\n      }\n      refundPolicy {\n        ...PolicyItem\n      }\n      subscriptionPolicy {\n        id\n        title\n        handle\n      }\n    }\n  }\n': {
    return: PoliciesQuery;
    variables: PoliciesQueryVariables;
  };
  '#graphql\n  query Artwork(\n    $country: CountryCode\n    $handle: String!\n    $language: LanguageCode\n    $selectedOptions: [SelectedOptionInput!]!\n  ) @inContext(country: $country, language: $language) {\n    product(handle: $handle) {\n      id\n      title\n      vendor\n      handle\n      productType\n      descriptionHtml\n      description\n      encodedVariantExistence\n      encodedVariantAvailability\n      images(first: 8) {\n        nodes { id url altText width height }\n      }\n      options {\n        name\n        optionValues {\n          name\n          firstSelectableVariant { ...ArtworkVariant }\n          swatch { color image { previewImage { url } } }\n        }\n      }\n      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {\n        ...ArtworkVariant\n      }\n      adjacentVariants(selectedOptions: $selectedOptions) { ...ArtworkVariant }\n      seo { description title }\n      artist: metafield(namespace: "phulhaar", key: "artist") {\n        reference {\n          ... on Metaobject {\n            handle\n            displayName: field(key: "display_name") { value }\n          }\n        }\n      }\n      year: metafield(namespace: "phulhaar", key: "year") { value }\n      heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n      widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n      depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n      mediums: metafield(namespace: "phulhaar", key: "mediums") {\n        references(first: 5) { nodes { ... on Metaobject { field(key: "name") { value } } } }\n      }\n      traditions: metafield(namespace: "phulhaar", key: "traditions") {\n        references(first: 5) { nodes { ... on Metaobject { field(key: "name") { value } } } }\n      }\n      surface: metafield(namespace: "phulhaar", key: "surface") {\n        reference { ... on Metaobject { field(key: "name") { value } } }\n      }\n      artistNote: metafield(namespace: "phulhaar", key: "artist_note") { value }\n      signed: metafield(namespace: "phulhaar", key: "signed") { value }\n      framed: metafield(namespace: "phulhaar", key: "framed") { value }\n      frameDetails: metafield(namespace: "phulhaar", key: "frame_details") { value }\n      hasCertificate: metafield(namespace: "phulhaar", key: "has_certificate") { value }\n      shipsAs: metafield(namespace: "phulhaar", key: "ships_as") { value }\n    }\n  }\n  #graphql\n  fragment ArtworkVariant on ProductVariant {\n    availableForSale\n    compareAtPrice { amount currencyCode }\n    id\n    image { __typename id url altText width height }\n    price { amount currencyCode }\n    product { title handle }\n    selectedOptions { name value }\n    sku\n    title\n    unitPrice { amount currencyCode }\n  }\n\n': {
    return: ArtworkQuery;
    variables: ArtworkQueryVariables;
  };
  '#graphql\n  query RelatedArtworks($country: CountryCode, $language: LanguageCode, $query: String)\n  @inContext(country: $country, language: $language) {\n    products(first: 5, query: $query, sortKey: BEST_SELLING) {\n      nodes { ...ArtworkCard }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: RelatedArtworksQuery;
    variables: RelatedArtworksQueryVariables;
  };
  '#graphql\n  query StudioWorks($country: CountryCode, $language: LanguageCode, $query: String)\n  @inContext(country: $country, language: $language) {\n    products(first: 100, query: $query, sortKey: CREATED_AT, reverse: true) {\n      nodes { ...ArtworkCard }\n    }\n  }\n  #graphql\n  fragment ArtworkCard on Product {\n    id\n    handle\n    title\n    vendor\n    productType\n    availableForSale\n    featuredImage {\n      id\n      altText\n      url\n      width\n      height\n    }\n    priceRange {\n      minVariantPrice {\n        amount\n        currencyCode\n      }\n    }\n    artist: metafield(namespace: "phulhaar", key: "artist") {\n      reference {\n        ... on Metaobject {\n          handle\n          displayName: field(key: "display_name") { value }\n          artistId: field(key: "artist_id") { value }\n        }\n      }\n    }\n    year: metafield(namespace: "phulhaar", key: "year") { value }\n    heightCm: metafield(namespace: "phulhaar", key: "height_cm") { value }\n    widthCm: metafield(namespace: "phulhaar", key: "width_cm") { value }\n    depthCm: metafield(namespace: "phulhaar", key: "depth_cm") { value }\n    mediums: metafield(namespace: "phulhaar", key: "mediums") {\n      references(first: 3) {\n        nodes {\n          ... on Metaobject { field(key: "name") { value } }\n        }\n      }\n    }\n  }\n\n': {
    return: StudioWorksQuery;
    variables: StudioWorksQueryVariables;
  };
}

interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface StorefrontQueries extends GeneratedQueryTypes {}
  interface StorefrontMutations extends GeneratedMutationTypes {}
}
