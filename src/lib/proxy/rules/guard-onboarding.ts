import { HOME_PATH, ONBOARDING_PATH } from '@proxy/constants';
import type { ProxyRule } from '@proxy/types';

export const guardOnboardingForCompleted: ProxyRule = ctx => {
  if (!ctx.pathname.startsWith(ONBOARDING_PATH) || !ctx.user) {
    return;
  }

  // If user already has a household or they've already completed/skipped
  // onboarding, send them to the app home.
  if (ctx.hasHousehold || ctx.onboardingStatus !== 'unknown') {
    return ctx.redirect(HOME_PATH);
  }
};
