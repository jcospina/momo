import { ProfileProvider } from '@providers/profile-provider';
import { RealtimeClientProvider } from '@providers/realtime-client-provider';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentUser } from '@/lib/data/auth/server';
import { getProfile } from '@/lib/data/profile/server';
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
  return (
    <RealtimeClientProvider>
      <ProfileProvider profile={profile}>{children}</ProfileProvider>
    </RealtimeClientProvider>
  );
}
