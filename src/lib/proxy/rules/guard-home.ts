import { HOME_PATH, ONBOARDING_PATH } from '@proxy/constants';
import type { ProxyRule } from '@proxy/types';

export const guardHomeRequiresHousehold: ProxyRule = ctx => {
  const isHomePath =
    ctx.pathname === HOME_PATH || ctx.pathname.startsWith(`${HOME_PATH}/`);

  if (!isHomePath) {
    return;
  }

  if (!ctx.user) {
    return;
  }

  // Only redirect to onboarding if the user has no household and hasn't
  // explicitly skipped or completed onboarding.
  if (!ctx.hasHousehold && ctx.onboardingStatus === 'unknown') {
    return ctx.redirect(ONBOARDING_PATH);
  }
};
