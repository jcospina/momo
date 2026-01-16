import { redirect } from 'next/navigation';

type RootProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function Root({ searchParams }: RootProps) {
  const { error } = await searchParams;
  const dest = error ? `/login?error=${encodeURIComponent(error)}` : '/login';
  redirect(dest);
}
