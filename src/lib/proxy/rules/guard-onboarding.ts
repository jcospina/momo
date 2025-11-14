import { HOME_PATH, ONBOARDING_PATH } from '@proxy/constants';
import type { ProxyRule } from '@proxy/types';

export const guardOnboardingForCompleted: ProxyRule = ctx => {
  if (!ctx.pathname.startsWith(ONBOARDING_PATH) || !ctx.user) {
    return;
  }

  if (ctx.hasHousehold) {
    return ctx.redirect(HOME_PATH);
  }
};
