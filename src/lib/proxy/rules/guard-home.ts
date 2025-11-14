import { HOME_PATH, ONBOARDING_PATH } from '@proxy/constants';
import type { ProxyRule } from '@proxy/types';

export const guardHomeRequiresHousehold: ProxyRule = ctx => {
  if (!ctx.user || !ctx.pathname.startsWith(HOME_PATH)) {
    return;
  }

  if (!ctx.hasHousehold) {
    return ctx.redirect(ONBOARDING_PATH);
  }
};
