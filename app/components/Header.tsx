import {Suspense} from 'react';
import {Await, Link, NavLink, useAsyncValue} from 'react-router';
import {
  type CartViewPayload,
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {GALLERY, NAV} from '~/lib/gallery';

interface HeaderProps {
  cart: Promise<CartApiQueryFragment | null>;
  announcement?: string | null;
}

type Viewport = 'desktop' | 'mobile';

export function Header({cart, announcement}: HeaderProps) {
  return (
    <>
      {announcement ? <div className="announce">{announcement}</div> : null}
      <header className="header">
        <div className="header-inner">
          <Link
            prefetch="intent"
            to="/"
            className="brand"
            aria-label={`${GALLERY.name}, home`}
          >
            <img
              className="brand-garland"
              src="/brand/phulhaar-garland.webp"
              alt=""
              width="48"
              height="72"
            />
            <img
              className="brand-wordmark"
              src="/brand/phulhaar-wordmark.svg"
              alt="Phulhaar"
              width="170"
              height="30"
            />
          </Link>
          <HeaderMenu viewport="desktop" />
          <HeaderCtas cart={cart} />
        </div>
      </header>
    </>
  );
}

export function HeaderMenu({viewport}: {viewport: Viewport}) {
  const {close} = useAside();

  return (
    <nav className={`header-menu-${viewport}`} aria-label="Main">
      {viewport === 'mobile' && (
        <NavLink end onClick={close} prefetch="intent" to="/">
          Home
        </NavLink>
      )}
      {NAV.map((item) => (
        <NavLink
          className={({isActive}) =>
            `header-menu-item${isActive ? ' active' : ''}`
          }
          key={item.to}
          onClick={close}
          prefetch="intent"
          to={item.to}
        >
          {item.label}
        </NavLink>
      ))}
      {viewport === 'mobile' && (
        <NavLink onClick={close} prefetch="intent" to="/studio">
          Artist sign-in
        </NavLink>
      )}
    </nav>
  );
}

/**
 * Release 1 sells by enquiry, with Razorpay checkout in a later release, so there is no cart to
 * open. The /cart route and the cart itself stay in place, ready for when it returns.
 */
const SHOW_CART = false;

function HeaderCtas({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <nav className="header-ctas" aria-label="Shop">
      <SearchToggle />
      <NavLink prefetch="intent" to="/studio" className="hide-small">
        Artist sign-in
      </NavLink>
      {SHOW_CART ? <CartToggle cart={cart} /> : null}
      <HeaderMenuMobileToggle />
    </nav>
  );
}

function HeaderMenuMobileToggle() {
  const {open} = useAside();
  return (
    <button
      className="header-menu-mobile-toggle reset"
      onClick={() => open('mobile')}
      aria-label="Open the menu"
    >
      ☰
    </button>
  );
}

function SearchToggle() {
  const {open} = useAside();
  return (
    <button className="reset" onClick={() => open('search')}>
      Search
    </button>
  );
}

function CartBadge({count}: {count: number}) {
  const {open} = useAside();
  const {publish, shop, cart, prevCart} = useAnalytics();

  return (
    <a
      href="/cart"
      onClick={(e) => {
        e.preventDefault();
        open('cart');
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload);
      }}
    >
      Cart
      {count > 0 ? (
        <span className="cart-count" aria-label={`(${count} in cart)`}>
          {count}
        </span>
      ) : null}
    </a>
  );
}

function CartToggle({cart}: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={<CartBadge count={0} />}>
      <Await resolve={cart}>
        <CartBanner />
      </Await>
    </Suspense>
  );
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null;
  const cart = useOptimisticCart(originalCart);
  return <CartBadge count={cart?.totalQuantity ?? 0} />;
}
