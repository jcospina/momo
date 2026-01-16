import { HOME_PATH, ONBOARDING_PATH, ROOT_PATH } from '@proxy/constants';
import type { ProxyRule } from '@proxy/types';

const protectedPrefixes = [HOME_PATH, ONBOARDING_PATH];

export const redirectUnauthenticated: ProxyRule = ctx => {
  if (ctx.user) {
    return;
  }

  if (protectedPrefixes.some(prefix => ctx.pathname.startsWith(prefix))) {
    return ctx.redirect(ROOT_PATH);
  }
};
