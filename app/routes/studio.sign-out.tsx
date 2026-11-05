import {redirect} from 'react-router';
import type {Route} from './+types/studio.sign-out';
import {ARTIST_KEY, CHALLENGE_KEY} from '~/lib/artist-session.server';

export async function loader() {
  return redirect('/studio');
}

export async function action({context}: Route.ActionArgs) {
  context.session.unset(ARTIST_KEY);
  context.session.unset(CHALLENGE_KEY);
  return redirect('/');
}
