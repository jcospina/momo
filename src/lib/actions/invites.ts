'use server';

import { randomBytes } from 'crypto';

import { Resend } from 'resend';
import { cookies } from 'next/headers';

import {
  fetchHouseholdById,
  fetchHouseholdMembership,
} from '@helpers/households';
import { findUserAndHouseholdByEmail } from '@helpers/invites';
import type { InviteInput, SendInvitesState } from '@lib-types/invites';
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from '@supabase/server';
import { redirect } from 'next/navigation';
import { loginWithProvider } from './login';

const TEMPLATE_ID = 'momo-invite-template';

function parseInvites(formData: FormData): InviteInput[] {
  const invites: InviteInput[] = [];

  for (let i = 1; i <= 4; i += 1) {
    const name = formData.get(`inviteName${i}`);
    const email = formData.get(`inviteEmail${i}`);

    if (!name && !email) {
      continue;
    }

    if (typeof name !== 'string' || typeof email !== 'string') {
      throw new Error('Invalid invite input.');
    }

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      throw new Error('Please provide both name and email for each invite.');
    }

    invites.push({ name: trimmedName, email: trimmedEmail });
  }

  return invites;
}

export async function sendInvites(
  _prev: SendInvitesState,
  formData: FormData,
): Promise<SendInvitesState> {
  let invites: InviteInput[];

  try {
    invites = parseInvites(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Invalid input.' };
  }

  if (invites.length === 0) {
    return { error: 'Add at least one invite (up to 4).' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const membership = await fetchHouseholdMembership(supabase, user.id);

  if (!membership) {
    redirect('/onboarding');
  }

  const household = await fetchHouseholdById(supabase, membership.household_id);

  if (!household) {
    return { error: 'Could not find your household.' };
  }

  const serviceClient = createSupabaseServiceRoleClient();

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    return { error: 'Missing RESEND_FROM_EMAIL configuration.' };
  }

  try {
    for (const invite of invites) {
      // Validate the invitee is not already in a household
      const { hasHousehold } = await findUserAndHouseholdByEmail(
        serviceClient,
        invite.email,
      );

      if (hasHousehold) {
        return {
          error: `${invite.email} already belongs to a household.`,
        };
      }

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(
        Date.now() + 72 * 60 * 60 * 1000,
      ).toISOString();

      const { error: inviteError } = await supabase.from('invites').insert({
        household_id: household.id,
        email: invite.email,
        token,
        expires_at: expiresAt,
      });

      if (inviteError) {
        console.error('Could not create invite', inviteError);
        return {
          error:
            inviteError.message ?? 'Could not create invite. Please try again.',
        };
      }

      const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/invite?token=${token}`;

      const { error: emailError } = await resend.emails.send({
        from: fromEmail,
        to: invite.email,
        template: {
          id: TEMPLATE_ID,
          variables: {
            INVITEE: invite.name,
            WHO: user.user_metadata?.name ?? 'A friend',
            HOUSEHOLD_NAME: household.name,
            INVITE_LINK: inviteLink,
          },
        },
      });

      if (emailError) {
        console.error('Could not send invite email', emailError);
        return {
          error:
            emailError.message ??
            'Could not send invite email. Please try again.',
        };
      }
    }
  } catch (error) {
    console.error('Send invite failed', error);
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Could not send invites. Please try again.',
    };
  }

  return { success: `Sent ${invites.length} invite(s).` };
}

export async function startInviteFlow(formData: FormData) {
  'use server';

  const inviteToken = formData.get('token');

  if (typeof inviteToken === 'string' && inviteToken) {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'invite_token',
      value: inviteToken,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 3,
    });
  }

  return loginWithProvider('google');
}
