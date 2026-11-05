import {redirect} from 'react-router';
import type {Route} from './+types/admin_.sign-out';
import {STAFF_CHALLENGE_KEY, STAFF_KEY} from '~/lib/staff-session.server';

export async function loader() {
  return redirect('/admin');
}

export async function action({context}: Route.ActionArgs) {
  context.session.unset(STAFF_KEY);
  context.session.unset(STAFF_CHALLENGE_KEY);
  return redirect('/admin/sign-in');
}
