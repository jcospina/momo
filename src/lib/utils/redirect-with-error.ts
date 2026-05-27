import type { MomoError } from '@lib-types/errors';
import { redirect } from 'next/navigation';

export function redirectWithError(path: string, errorCode: MomoError): never {
  const url = new URL(
    path,
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost',
  );
  url.searchParams.set('error', errorCode);
  redirect(url.pathname + url.search);
}
