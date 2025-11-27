import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@auth/user';
import { fetchInviteDetails, hashInviteToken } from '@helpers/invites';
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@supabase/server';

function InviteAcceptState({
  title,
  message,
  actionHref = '/onboarding',
  actionLabel = 'Continue',
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-10">
      <div className="rounded-lg border border-rust bg-background/60 px-6 py-8 shadow-sm">
        <p className="text-sm uppercase tracking-wide text-rust">Invite</p>
        <h1 className="mt-2 font-cherry-bomb-one text-4xl text-gamboge">
          {title}
        </h1>
        <p className="mt-3 text-foreground">{message}</p>
        <div className="mt-6">
          <a
            href={actionHref}
            className="inline-flex w-full items-center justify-center rounded-md bg-gamboge px-4 py-2 font-semibold text-background transition hover:bg-gamboge/90"
          >
            {actionLabel}
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function InviteAcceptPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('invite_token')?.value;

  if (!token) {
    redirect('/onboarding');
  }

  const supabase = await createSupabaseServerClient();
  const serviceClient = createSupabaseServiceRoleClient();

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let inviteDetails = null;

  try {
    inviteDetails = await fetchInviteDetails(serviceClient, token);
  } catch (error) {
    console.error('Invite validation failed', error);
    return (
      <InviteAcceptState
        title="Something went wrong"
        message="We could not validate this invite right now. Please try again."
      />
    );
  }

  if (!inviteDetails) {
    return (
      <InviteAcceptState
        title="Invalid invite"
        message="We could not find this invite. Please request a new one."
      />
    );
  }

  if (inviteDetails.status === 'used') {
    return (
      <InviteAcceptState
        title="Invite already used"
        message="This invite has already been used. Please ask for a new invite if you still need access."
      />
    );
  }

  if (inviteDetails.status === 'expired') {
    return (
      <InviteAcceptState
        title="Invite expired"
        message="This invite expired. Please request a fresh invite from the person who shared it with you."
      />
    );
  }

  if (inviteDetails.invitee_email.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <InviteAcceptState
        title="Wrong account"
        message="This invite was sent to a different email address."
      />
    );
  }

  const householdId = inviteDetails.household_id;

  const { error: insertError } = await supabase
    .from('household_members')
    .insert({
      household_id: householdId,
      user_id: user.id,
      role: 'member',
    });

  if (insertError) {
    console.error('Add member failed', insertError);
    return (
      <InviteAcceptState
        title="Could not join"
        message="We could not add you to this household. If you already belong to another household, leave it first."
      />
    );
  }

  const hashedToken = hashInviteToken(token);
  const { error: markError } = await serviceClient
    .from('invites')
    .update({ used_at: new Date().toISOString() })
    .eq('token', hashedToken);

  if (markError) {
    console.error('Mark invite used failed', markError);
  }

  redirect('/home');
}
