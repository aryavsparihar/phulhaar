/**
 * Who may use /admin: PJK staff, signed in through PJK, with a pjk.co.in address.
 *
 * Two locks, both required. PJK decides who its staff are (anyone who can sign in to PJK's own
 * admin) and signs a token saying so; this file refuses any address outside pjk.co.in even if
 * PJK were to vouch for it, so a mistake on one side does not open the other.
 */
import {redirect} from 'react-router';
import type {HydrogenSession} from '@shopify/hydrogen';
import {PjkError, type StaffClaims} from '~/lib/pjk.server';

export const STAFF_KEY = 'staff';
export const STAFF_CHALLENGE_KEY = 'staffChallenge';

/** Staff sessions are short: a day, not a month. */
const STAFF_SESSION_HOURS = 12;

/** user@pjk.co.in or user@anything.pjk.co.in, and nothing else. */
export function isPjkEmail(email: string) {
  return /^[a-z0-9._%+-]+@([a-z0-9-]+\.)*pjk\.co\.in$/i.test(email.trim());
}

export interface SignedInStaff {
  email: string;
  name: string;
  role: 'admin' | 'editor';
  signedInAt: number;
}

export interface PendingStaffChallenge {
  challengeId: string;
  email: string;
  expiresAt: number;
}

export function currentStaff(session: HydrogenSession): SignedInStaff | null {
  const staff = session.get(STAFF_KEY) as SignedInStaff | undefined;
  if (!staff?.email || !isPjkEmail(staff.email)) return null;
  if (Date.now() - staff.signedInAt > STAFF_SESSION_HOURS * 60 * 60 * 1000)
    return null;
  return staff;
}

export function staffFromClaims(
  claims: StaffClaims,
): Omit<SignedInStaff, 'signedInAt'> {
  if (claims.kind !== 'staff' || !claims.email || !isPjkEmail(claims.email)) {
    throw new PjkError('Not a pjk.co.in staff token', 403, 'not_pjk_staff');
  }
  return {
    email: claims.email.toLowerCase(),
    name: claims.name || claims.email,
    role: claims.role === 'admin' ? 'admin' : 'editor',
  };
}

/**
 * Every admin loader and action starts here. Signed-in PJK staff only; for anything that changes
 * data, the request must also come from this site (a same-origin check on top of the SameSite
 * cookie), and deleting needs the admin role.
 */
export function requireStaff(
  request: Request,
  session: HydrogenSession,
  {role}: {role?: 'admin'} = {},
): SignedInStaff {
  const staff = currentStaff(session);
  const url = new URL(request.url);
  if (!staff) {
    throw redirect(
      `/admin/sign-in?next=${encodeURIComponent(url.pathname + url.search)}`,
    );
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) {
      throw new Response('This form must be sent from the Phulhaar admin.', {
        status: 403,
      });
    }
  }
  if (role === 'admin' && staff.role !== 'admin') {
    throw new Response('Only an admin can do that.', {status: 403});
  }
  return staff;
}

/** Only a path inside /admin is a safe place to return to after signing in. */
export function safeNext(next: string | null) {
  return next && next.startsWith('/admin') && !next.startsWith('//')
    ? next
    : '/admin';
}
