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
