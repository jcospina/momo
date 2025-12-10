import type { MomoError } from '@lib-types/errors';

export const ERROR_MESSAGES: Record<MomoError, string> = {
  auth_provider_failed:
    'Something went wrong with Google, this one is not on me.',
  auth_user_missing: 'For some reason you got in but I cannot find you.',
  auth_exchange_failed:
    'You almost got in but something failed. This one is on me. Sorry.',
  auth_required:
    'Aha! You tried creating something you are not suposed to. Sneaky sneaky.',
  logout_failed: 'Something is preventing me from letting you out. Sorry.',
  household_name_required: "Who doesn't put a name to it's home?",
  household_create_failed:
    'This one is my fault, I cannot create your household. Sorry.',
  household_membership_create_failed: '',
  household_full: 'This household is overcrowded, you cannot get in.',
  household_invalid:
    'There is something very wrong about the household you just tried to join.',
  no_household:
    'Someone tricked you into believing this invite was valid. Shame on them.',
  user_has_a_household: 'You already belong to one home, no cheating please.',
  profile_create_failed: 'I cannot create your profile. This one is on me.',
  user_pref_update_failed: 'I cannot update your preferences, sorry mate.',
};
