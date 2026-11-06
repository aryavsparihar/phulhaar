/**
 * A smoke test: the app boots, serves a page, and does not leak a secret into what it sends.
 *
 * It is deliberately thin. The catalogue's own pages do not exist yet, so asserting anything
 * about their content would be asserting about Hydrogen's scaffolding, and those assertions would
 * have to be deleted as soon as the real pages arrive. What is worth testing from the first day is
 * that the server starts against the mocks and that nothing server-side ends up in the HTML --
 * both of which would otherwise be noticed late.
 */

import {expect, test} from '@playwright/test';

test('the home page is served', async ({page}) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).toBeVisible();
});

test('a page that does not exist answers 404 rather than 500', async ({
  page,
}) => {
  const response = await page.goto('/a-page-that-has-never-existed');

  // Hydrogen looks for a Shopify redirect before giving up, so this also proves that path works.
  expect(response?.status()).toBe(404);
});

test('no server-side secret reaches the browser', async ({page}) => {
  await page.goto('/');
  const html = await page.content();

  // The names, not the values: a value could legitimately be absent in CI, whereas finding any of
  // these names in the HTML means a loader has returned something it should have kept.
  for (const forbidden of [
    'SESSION_SECRET',
    'PRIVATE_ADMIN_API_TOKEN',
    'PJK_SHARED_SECRET',
    'PJK_WEBHOOK_SECRET',
  ]) {
    expect(html, `${forbidden} must never appear in a page`).not.toContain(
      forbidden,
    );
  }
});

test('robots.txt is served, so the catalogue can be indexed deliberately', async ({
  request,
}) => {
  const response = await request.get('/robots.txt');

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('User-agent');
});

for (const path of [
  '/collections/all',
  '/artists',
  '/search',
  '/visit',
  '/for-artists',
]) {
  test(`${path} is served`, async ({page}) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });
}

test('the studio sends a visitor who is not signed in to artist sign-in', async ({
  page,
}) => {
  await page.goto('/studio');
  await expect(page).toHaveURL(/\/studio\/sign-in$/);
  await expect(page.getByLabel('Artist ID')).toBeVisible();
});

test('artist sign-in refuses something that is not an Artist ID', async ({
  page,
}) => {
  await page.goto('/studio/sign-in');
  await page.getByLabel('Artist ID').fill('not-an-id');
  await page.getByRole('button', {name: 'Email me a code'}).click();
  await expect(page.getByRole('alert')).toContainText('Artist ID');
});

test('a real Artist ID gets as far as the code', async ({page}) => {
  await page.goto('/studio/sign-in');
  await page.getByLabel('Artist ID').fill('AT000123');
  await page.getByRole('button', {name: 'Email me a code'}).click();
  await expect(page.getByLabel('One-time code')).toBeVisible();
});

test('the admin sends a visitor who is not signed in to staff sign-in', async ({
  page,
}) => {
  await page.goto('/admin/artworks');
  await expect(page).toHaveURL(/\/admin\/sign-in\?next=/);
  await expect(page.getByLabel('PJK email address')).toBeVisible();
});

test('admin sign-in refuses an address outside pjk.co.in', async ({page}) => {
  await page.goto('/admin/sign-in');
  await page.getByLabel('PJK email address').fill('someone@gmail.com');
  await page.getByRole('button', {name: 'Email me a code'}).click();
  await expect(page.getByRole('alert')).toContainText('pjk.co.in');
});

test('a PJK staff address gets as far as the code', async ({page}) => {
  await page.goto('/admin/sign-in');
  await page.getByLabel('PJK email address').fill('admin@pjk.co.in');
  await page.getByRole('button', {name: 'Email me a code'}).click();
  await expect(page.getByLabel('One-time code')).toBeVisible();
});

test('the search API answers with JSON', async ({request}) => {
  const response = await request.get('/api/search?q=hoodie');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body.works)).toBe(true);
});

test('a product that is not an artwork is not shown as one', async ({page}) => {
  // mock.shop's sample clothes have no artist, so their pages answer 404.
  const response = await page.goto('/products/sweatpants');
  expect(response?.status()).toBe(404);
});

test('artwork filters show as pills with a way to clear them', async ({
  page,
}) => {
  await page.goto('/collections/all?available=1&size=small');
  const pills = page.getByRole('list', {name: 'Filters in use'});
  await expect(
    pills.getByRole('link', {name: 'Remove Available'}),
  ).toBeVisible();
  await expect(
    pills.getByRole('link', {name: 'Remove Small, under 45 cm'}),
  ).toBeVisible();
  await pills.getByRole('link', {name: 'Clear filters'}).click();
  await expect(page).toHaveURL(/\/collections\/all$/);
  await expect(page.getByRole('list', {name: 'Filters in use'})).toHaveCount(0);
});

test('an unknown filter value is ignored rather than an error', async ({
  page,
}) => {
  const response = await page.goto(
    '/collections/all?size=enormous&orientation=round&page=-4',
  );
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('list', {name: 'Filters in use'})).toHaveCount(0);
});

for (const path of ['/artists?view=state', '/artists?letter=S&name=sita']) {
  test(`the artist directory answers ${path}`, async ({page}) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
  });
}

test('the visit page explains visits before the address is set', async ({
  page,
}) => {
  await page.goto('/visit');
  await expect(page.getByRole('heading', {name: 'Where'})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'When'})).toBeVisible();
  await expect(page.getByText('8 November 2026').first()).toBeVisible();
  const data = JSON.parse(
    (await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent()) ?? '{}',
  ) as {'@type'?: string; email?: string};
  expect(data['@type']).toBe('ArtGallery');
  expect(data.email).toBe('hello@pjk.co.in');
});

test('a colour filter shows as a pill', async ({page}) => {
  await page.goto('/collections/all?colour=Indigo');
  await expect(
    page
      .getByRole('list', {name: 'Filters in use'})
      .getByRole('link', {name: 'Remove Indigo'}),
  ).toBeVisible();
});

/** What CartForm posts: the action and its inputs as JSON, beside any plain fields. */
function cartForm(redirectTo?: string) {
  return {
    cartFormInput: JSON.stringify({
      action: 'LinesAdd',
      // A mock.shop variant that is always for sale; the artwork page sends the work's own.
      inputs: {
        lines: [
          {
            merchandiseId: 'gid://shopify/ProductVariant/43695710371862',
            quantity: 1,
          },
        ],
      },
    }),
    ...(redirectTo ? {redirectTo} : {}),
  };
}

test('Buy now adds the work and hands the buyer to Shopify checkout', async ({
  request,
}) => {
  const response = await request.post('/cart', {
    form: cartForm('__checkout'),
    maxRedirects: 0,
  });

  expect(response.status()).toBe(303);
  const location = new URL(response.headers()['location'] ?? '');
  expect(location.protocol).toBe('https:');
  // Shopify's checkout, off this site: /cart/c/… on a real store, /checkout on mock.shop.
  expect(location.hostname).not.toBe('localhost');
  expect(location.pathname).toMatch(/^\/(cart\/c\/|checkout)/);
  // The cart is remembered, so the buyer coming back from checkout still has it.
  expect(response.headers()['set-cookie'] ?? '').toContain('cart=');
});

test('the cart never redirects a buyer to somebody else’s site', async ({
  request,
}) => {
  const response = await request.post('/cart', {
    form: cartForm('https://example.com/'),
    maxRedirects: 0,
  });

  expect(response.status()).toBe(200);
  expect(response.headers()['location']).toBeUndefined();
});
