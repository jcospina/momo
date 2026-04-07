import type { SupportedLanguage } from '@lib-types/user-preferences';
import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

const DEFAULT_LOCALE: SupportedLanguage = 'en';
const SUPPORTED: readonly SupportedLanguage[] = ['en', 'es'];

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: SupportedLanguage =
    raw && SUPPORTED.includes(raw as SupportedLanguage)
      ? (raw as SupportedLanguage)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
