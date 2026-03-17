import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/data/auth/server';
import { getProfile } from '@/lib/data/profile/server';
import { ProfileProvider } from '@providers/profile-provider';

import type { ReactNode } from 'react';
export default async function HomeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const profile = await getProfile(user.id);
  if (!profile) {
    redirect('/login');
  }
  return <ProfileProvider profile={profile}>{children}</ProfileProvider>;
}
