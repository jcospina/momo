import type { NextRequest } from 'next/server';

import { buildProxyContext } from '@proxy/context';
import { proxyRules } from '@proxy/rules';

export async function proxy(request: NextRequest) {
  const ctx = await buildProxyContext(request);

  for (const rule of proxyRules) {
    const response = rule(ctx);
    if (response) {
      return response;
    }
  }

  return ctx.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
