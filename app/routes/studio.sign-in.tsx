import {
  Form,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/studio.sign-in';
import {parseEnv} from '~/lib/env.server';
import {
  ARTIST_ID_PATTERN,
  requestSignInCode,
  verifySignInCode,
} from '~/lib/pjk.server';
import {
  ARTIST_KEY,
  CHALLENGE_KEY,
  currentArtist,
  messageFor,
  signInConfig,
  verifyArtistToken,
  type PendingChallenge,
  type SignedInArtist,
} from '~/lib/artist-session.server';
import {GALLERY} from '~/lib/gallery';

export const meta: Route.MetaFunction = () => [
  {title: 'Artist sign-in — Phulhaar Gallery'},
  {name: 'robots', content: 'noindex'},
];

/** How long a code stays usable on our side; PJK enforces its own limit too. */
const CHALLENGE_MINUTES = 10;

export async function loader({context}: Route.LoaderArgs) {
  if (currentArtist(context.session)) throw redirect('/studio');

  const challenge = context.session.get(CHALLENGE_KEY) as
    PendingChallenge | undefined;
  const live = challenge && challenge.expiresAt > Date.now() ? challenge : null;

  return {pendingArtistId: live?.artistId ?? null};
}

export async function action({context, request}: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get('intent');
  const {session} = context;

  try {
    const config = signInConfig(parseEnv(context.env));

    if (intent === 'restart') {
      session.unset(CHALLENGE_KEY);
      return {error: null};
    }

    if (intent === 'request') {
      const artistId = String(form.get('artistId') ?? '')
        .trim()
        .toUpperCase();
      if (!ARTIST_ID_PATTERN.test(artistId)) {
        return {
          error:
            'That does not look like an Artist ID. It starts with AT or PT, followed by six digits.',
        };
      }
      const {challengeId} = await requestSignInCode(config, artistId);
      session.set(CHALLENGE_KEY, {
        challengeId,
        artistId,
        expiresAt: Date.now() + CHALLENGE_MINUTES * 60 * 1000,
      } satisfies PendingChallenge);
      return {error: null};
    }

    if (intent === 'verify') {
      const challenge = session.get(CHALLENGE_KEY) as
        PendingChallenge | undefined;
      if (!challenge || challenge.expiresAt < Date.now()) {
        session.unset(CHALLENGE_KEY);
        return {error: 'That code has expired. Ask for a new one.'};
      }
      const code = String(form.get('code') ?? '').replace(/\s+/g, '');
      if (!/^\d{4,8}$/.test(code)) {
        return {error: 'Enter the code from the email, digits only.'};
      }

      const {token} = await verifySignInCode(config, {
        challengeId: challenge.challengeId,
        code,
      });
      const claims = await verifyArtistToken(token, config);

      if (claims.artistId !== challenge.artistId) {
        session.unset(CHALLENGE_KEY);
        return {error: 'Something did not match. Please start again.'};
      }

      session.unset(CHALLENGE_KEY);
      session.set(ARTIST_KEY, {
        artistId: claims.artistId,
        displayName: claims.displayName,
        signedInAt: Date.now(),
      } satisfies SignedInArtist);
      return redirect('/studio');
    }

    return {error: 'Please start again.'};
  } catch (error) {
    console.error('artist sign-in failed:', error);
    return {error: messageFor(error)};
  }
}

export default function StudioSignIn() {
  const {pendingArtistId} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';

  return (
    <div className="wrap studio">
      <div className="signin-card">
        <img
          className="signin-mark"
          src="/brand/phulhaar-garland.webp"
          alt=""
          width="72"
        />
        <p className="eyebrow" style={{textAlign: 'center'}}>
          The artist studio
        </p>
        <h1 style={{textAlign: 'center', fontSize: '2rem'}}>
          {pendingArtistId ? 'Enter your code' : 'Artist sign-in'}
        </h1>
        <hr className="gold-rule" />

        {result?.error ? (
          <p className="notice notice-error" role="alert">
            {result.error}
          </p>
        ) : null}

        {pendingArtistId ? (
          <>
            <p>
              PJK has emailed a one-time code to the address on the account for{' '}
              <strong>{pendingArtistId}</strong>. It lasts ten minutes.
            </p>
            <Form method="post" key="verify">
              <input type="hidden" name="intent" value="verify" />
              <div className="field">
                <label htmlFor="code">One-time code</label>
                <input
                  key="code"
                  id="code"
                  name="code"
                  defaultValue=""
                  className="code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9 ]*"
                  maxLength={10}
                  required
                />
              </div>
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? 'Checking' : 'Sign in'}
              </button>
            </Form>
            <Form
              method="post"
              style={{marginTop: '1rem', textAlign: 'center'}}
            >
              <input type="hidden" name="intent" value="restart" />
              <button className="reset link-arrow" type="submit">
                Use a different Artist ID
              </button>
            </Form>
          </>
        ) : (
          <>
            <p>
              For artists approved on PAT and J.K. Co. Enter your Artist ID and
              PJK will email you a one-time code.
            </p>
            <Form method="post" key="request">
              <input type="hidden" name="intent" value="request" />
              <div className="field">
                <label htmlFor="artistId">Artist ID</label>
                <input
                  id="artistId"
                  name="artistId"
                  placeholder="AT000123"
                  autoComplete="username"
                  autoCapitalize="characters"
                  spellCheck={false}
                  required
                />
              </div>
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? 'Asking PJK' : 'Email me a code'}
              </button>
            </Form>
            <p
              className="muted"
              style={{marginTop: '1.5rem', fontSize: '1rem'}}
            >
              Not with PJK yet?{' '}
              <a href={GALLERY.pjkOnboardingUrl} rel="noopener">
                Apply as an artist
              </a>
              . <Link to="/for-artists">How it works</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
