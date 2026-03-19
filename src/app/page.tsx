import { redirect } from 'next/navigation';

type RootProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Root({ searchParams }: RootProps) {
  const params = await searchParams;
  const code = params.code;
  const error = params.error;

  // Some OAuth flows can land on "/?code=..." when redirect URLs are normalized.
  // Forward those params to the dedicated callback route so session exchange runs.
  if (typeof code === 'string' && code.length > 0) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        qs.set(key, value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          qs.append(key, item);
        }
      }
    }
    redirect(`/auth/callback?${qs.toString()}`);
  }

  const errorValue = Array.isArray(error) ? error[0] : error;
  const dest =
    typeof errorValue === 'string' && errorValue.length > 0
      ? `/login?error=${encodeURIComponent(errorValue)}`
      : '/login';
  redirect(dest);
}
