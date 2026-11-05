import {Form, NavLink, Outlet, useLoaderData, useLocation} from 'react-router';
import type {Route} from './+types/admin';
import {parseEnv} from '~/lib/env.server';
import {adminClient} from '~/lib/admin-api.server';
import {requireStaff} from '~/lib/staff-session.server';

export const meta: Route.MetaFunction = () => [
  {title: 'Admin — Phulhaar Gallery'},
  {name: 'robots', content: 'noindex'},
];

export async function loader({context, request}: Route.LoaderArgs) {
  const staff = requireStaff(request, context.session);
  return {
    staff: {email: staff.email, name: staff.name, role: staff.role},
    connected: !!adminClient(parseEnv(context.env)),
  };
}

const NAV = [
  {to: '/admin', label: 'Dashboard', end: true},
  {to: '/admin/artworks', label: 'Artworks'},
  {to: '/admin/artworks?status=review', label: 'Review queue'},
  {to: '/admin/artists', label: 'Artists'},
  {to: '/admin/settings', label: 'Gallery settings'},
];

export default function AdminLayout() {
  const {staff, connected} = useLoaderData<typeof loader>();
  const {pathname, search} = useLocation();
  const reviewing = new URLSearchParams(search).get('status') === 'review';
  // NavLink ignores the query string, so the review queue and Artworks are told apart here.
  const activeFor = (to: string, isActive: boolean) =>
    to.includes('status=review')
      ? reviewing && pathname === '/admin/artworks'
      : to === '/admin/artworks'
        ? isActive && !reviewing
        : isActive;
  return (
    <div className="admin">
      <div className="admin-side">
        <a href="/" className="admin-brand">
          <img src="/brand/phulhaar-garland.webp" alt="" width="34" />
          <span>
            <img
              src="/brand/phulhaar-wordmark.svg"
              alt="Phulhaar"
              width="110"
            />
            <small>Admin</small>
          </span>
        </a>
        <nav>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({isActive}) =>
                activeFor(item.to, isActive) ? 'active' : ''
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-who">
          <strong>{staff.name}</strong>
          <span>{staff.email}</span>
          <span className="badge">{staff.role}</span>
          <Form method="post" action="/admin/sign-out">
            <button className="reset link-arrow" type="submit">
              Sign out
            </button>
          </Form>
        </div>
      </div>
      <div className="admin-main">
        {!connected ? (
          <div className="notice notice-error">
            <strong>The store is not connected yet.</strong> Set
            PUBLIC_STORE_DOMAIN to the store&rsquo;s *.myshopify.com domain and
            PRIVATE_ADMIN_API_TOKEN in .env (docs/SETUP.md), then run{' '}
            <code>pnpm shopify:setup</code>. Until then nothing here can be
            saved.
          </div>
        ) : null}
        <Outlet />
      </div>
    </div>
  );
}
