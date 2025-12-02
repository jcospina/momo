import Link from 'next/link';

import { startInviteFlow } from '@actions/invites';
import { fetchInviteByToken } from '@helpers/invites';
import { createSupabaseServiceRoleClient } from '@supabase/server';

type InvitePageProps = {
  searchParams?: Promise<{
    token?: string | string[];
  }>;
};

type InviteStateProps = {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

function InviteState({
  title,
  message,
  actionHref,
  actionLabel,
}: InviteStateProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <div className="rounded-lg border border-rust bg-background/60 px-6 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-rust">Invite</p>
        <h1 className="mt-2 font-cherry-bomb-one text-4xl text-gamboge">
          {title}
        </h1>
        <p className="mt-3 text-foreground">{message}</p>
        {actionHref ? (
          <div className="mt-6">
            <Link
              href={actionHref}
              className="inline-flex w-full items-center justify-center rounded-md bg-gamboge px-4 py-2 font-semibold text-background transition hover:bg-gamboge/90"
            >
              {actionLabel ?? 'Go to login'}
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default async function InviteLandingPage({
  searchParams,
}: InvitePageProps) {
  const resolvedSearch = searchParams ? await searchParams : undefined;
  const tokenParam = resolvedSearch?.token;
  const token =
    typeof tokenParam === 'string'
      ? tokenParam
      : Array.isArray(tokenParam)
        ? tokenParam[0]
        : '';

  if (!token) {
    return (
      <InviteState
        title="Invalid invite"
        message="We could not find an invite token in this link."
        actionHref="/login"
      />
    );
  }

  const supabase = createSupabaseServiceRoleClient();

  let invite = null;

  try {
    invite = await fetchInviteByToken(supabase, token);
  } catch (error) {
    console.error('Invite lookup failed', error);
    return (
      <InviteState
        title="Something went wrong"
        message="We could not load this invite right now. Please try again."
        actionHref="/login"
      />
    );
  }

  if (!invite) {
    return (
      <InviteState
        title="Invalid invite"
        message="This invite link is not valid or has been revoked."
        actionHref="/login"
      />
    );
  }

  if (invite.status === 'used') {
    return (
      <InviteState
        title="Invite already used"
        message="This invite has already been used. Please ask the inviter to send a new one if you still need access."
        actionHref="/login"
      />
    );
  }

  if (invite.status === 'expired') {
    return (
      <InviteState
        title="Invite expired"
        message="This invite expired. Please request a fresh invite from the person who shared it with you."
        actionHref="/login"
      />
    );
  }

  const inviterName =
    invite.inviter_name ?? invite.inviter_email ?? 'someone in this household';

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-12">
      <div className="rounded-lg border border-rust bg-background/60 px-6 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-rust">Invite</p>
        <h1 className="mt-2 text-5xl text-gamboge">
          Join {invite.household_name}
        </h1>
        <p className="mt-4 text-lg text-foreground">
          You were invited by{' '}
          <span className="font-semibold">{inviterName}</span> to join{' '}
          <span className="font-semibold">{invite.household_name}</span>.
        </p>
        <div className="mt-8 flex flex-col gap-4">
          <div className="text-sm text-foreground/80">
            Sign in with Google to join this household and start tracking your
            expenses together.
          </div>
          <form action={startInviteFlow} className="w-full">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-md bg-gamboge px-5 py-2 text-lg font-semibold text-background transition hover:bg-gamboge/90"
            >
              Join with Google
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
