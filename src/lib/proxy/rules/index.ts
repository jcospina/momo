import type { ProxyRule } from '@proxy/types';

import { guardHomeRequiresHousehold } from './guard-home';
import { guardOnboardingForCompleted } from './guard-onboarding';
import { redirectRootForAuthenticated } from './redirect-root';
import { redirectUnauthenticated } from './redirect-unauthenticated';

export const proxyRules: ProxyRule[] = [
  redirectUnauthenticated,
  redirectRootForAuthenticated,
  guardHomeRequiresHousehold,
  guardOnboardingForCompleted,
];
