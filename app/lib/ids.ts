/** Numeric ids in URLs, full GIDs for Shopify. Safe to use in the browser. */
export const gid = (type: 'Product' | 'Metaobject', id: string) =>
  id.startsWith('gid://') ? id : `gid://shopify/${type}/${id}`;
export const numericId = (value: string) => value.split('/').pop() ?? value;
