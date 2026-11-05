import {Await, useLocation} from 'react-router';
import {Suspense} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {SearchPanel} from '~/components/SearchPanel';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  enquiryEmail: string;
  announcement: string | null;
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  enquiryEmail,
  announcement,
}: PageLayoutProps) {
  // The admin is a workspace, not a page of the shop: no shop header, footer or cart.
  const {pathname} = useLocation();
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <main className="admin-shell">{children}</main>;
  }
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
      <Aside type="mobile" heading="Menu">
        <HeaderMenu viewport="mobile" />
      </Aside>
      <Header cart={cart} announcement={announcement} />
      <main>{children}</main>
      <Footer enquiryEmail={enquiryEmail} />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="Your cart">
      <Suspense fallback={<p>Loading your cart</p>}>
        <Await resolve={cart}>
          {(cart) => <CartMain cart={cart} layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  return (
    <Aside type="search" heading="Search">
      <SearchPanel />
    </Aside>
  );
}
