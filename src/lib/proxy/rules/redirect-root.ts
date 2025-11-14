import { HOME_PATH, ONBOARDING_PATH, ROOT_PATH } from '@proxy/constants';
import type { ProxyRule } from '@proxy/types';

export const redirectRootForAuthenticated: ProxyRule = ctx => {
  if (ctx.pathname !== ROOT_PATH || !ctx.user) {
    return;
  }

  return ctx.redirect(ctx.hasHousehold ? HOME_PATH : ONBOARDING_PATH);
};
