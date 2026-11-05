import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router';
import type {Route} from './+types/admin_.sign-in';
import {parseEnv} from '~/lib/env.server';
import {
  requestStaffCode,
  verifyStaffCode,
  type StaffClaims,
} from '~/lib/pjk.server';
import {
  messageFor,
  signInConfig,
  verifyPjkToken,
} from '~/lib/artist-session.server';
import {
  STAFF_CHALLENGE_KEY,
  STAFF_KEY,
  currentStaff,
  isPjkEmail,
  safeNext,
  staffFromClaims,
  type PendingStaffChallenge,
  type SignedInStaff,
} from '~/lib/staff-session.server';

export const meta: Route.MetaFunction = () => [
  {title: 'Admin sign-in — Phulhaar Gallery'},
  {name: 'robots', content: 'noindex'},
];

export async function loader({context, request}: Route.LoaderArgs) {
  const next = safeNext(new URL(request.url).searchParams.get('next'));
  if (currentStaff(context.session)) throw redirect(next);
  const challenge = context.session.get(STAFF_CHALLENGE_KEY) as
    PendingStaffChallenge | undefined;
  const live = challenge && challenge.expiresAt > Date.now() ? challenge : null;
  return {pendingEmail: live?.email ?? null, next};
}

export async function action({context, request}: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get('intent');
  const next = safeNext(String(form.get('next') ?? ''));
  const {session} = context;

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return {error: 'Please sign in from the Phulhaar admin itself.'};
  }

  try {
    const config = signInConfig(parseEnv(context.env));

    if (intent === 'restart') {
      session.unset(STAFF_CHALLENGE_KEY);
      return {error: null};
    }

    if (intent === 'request') {
      const email = String(form.get('email') ?? '')
        .trim()
        .toLowerCase();
      if (!isPjkEmail(email)) {
        return {
          error: 'Only pjk.co.in addresses can sign in to the Phulhaar admin.',
        };
      }
      const {challengeId} = await requestStaffCode(config, email);
      session.set(STAFF_CHALLENGE_KEY, {
        challengeId,
        email,
        expiresAt: Date.now() + 10 * 60 * 1000,
      } satisfies PendingStaffChallenge);
      return {error: null};
    }

    if (intent === 'verify') {
      const challenge = session.get(STAFF_CHALLENGE_KEY) as
        PendingStaffChallenge | undefined;
      if (!challenge || challenge.expiresAt < Date.now()) {
        session.unset(STAFF_CHALLENGE_KEY);
        return {error: 'That code has expired. Ask for a new one.'};
      }
      const code = String(form.get('code') ?? '').replace(/\s+/g, '');
      if (!/^\d{4,8}$/.test(code))
        return {error: 'Enter the code from the email, digits only.'};

      const {token} = await verifyStaffCode(config, {
        challengeId: challenge.challengeId,
        code,
      });
      const staff = staffFromClaims(
        await verifyPjkToken<StaffClaims>(token, config),
      );
      if (staff.email !== challenge.email) {
        session.unset(STAFF_CHALLENGE_KEY);
        return {error: 'Something did not match. Please start again.'};
      }
      session.unset(STAFF_CHALLENGE_KEY);
      session.set(STAFF_KEY, {
        ...staff,
        signedInAt: Date.now(),
      } satisfies SignedInStaff);
      return redirect(next);
    }

    return {error: 'Please start again.'};
  } catch (error) {
    console.error('staff sign-in failed:', error);
    return {error: messageFor(error)};
  }
}

export default function AdminSignIn() {
  const {pendingEmail, next} = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';

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
          Phulhaar admin
        </p>
        <h1 style={{textAlign: 'center', fontSize: '2rem'}}>
          {pendingEmail ? 'Enter your code' : 'Staff sign-in'}
        </h1>
        <hr className="gold-rule" />
        {result?.error ? (
          <p className="notice notice-error" role="alert">
            {result.error}
          </p>
        ) : null}

        {pendingEmail ? (
          <>
            <p>
              If <strong>{pendingEmail}</strong> can sign in to PJK, a one-time
              code is on its way to it. It lasts ten minutes.
            </p>
            <Form method="post" key="verify">
              <input type="hidden" name="intent" value="verify" />
              <input type="hidden" name="next" value={next} />
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
                Use a different address
              </button>
            </Form>
          </>
        ) : (
          <>
            <p>
              For PAT and J.K. Co. staff. Use the pjk.co.in address you sign in
              to PJK with.
            </p>
            <Form method="post" key="request">
              <input type="hidden" name="intent" value="request" />
              <input type="hidden" name="next" value={next} />
              <div className="field">
                <label htmlFor="email">PJK email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@pjk.co.in"
                  autoComplete="email"
                  required
                />
              </div>
              <button className="btn btn-block" type="submit" disabled={busy}>
                {busy ? 'Asking PJK' : 'Email me a code'}
              </button>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
