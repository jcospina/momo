import { Navbar } from '@/components/navbar/navbar';
import { Flex } from '@/ui/flex/flex';
import { getUserProfile } from '@helpers/profiles';
import { getCurrentUser } from '@helpers/user';
import { ProfileProvider } from '@providers/profile-provider';
import { redirect } from 'next/navigation';

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
  const profile = await getUserProfile(user.id);
  if (!profile) {
    redirect('/login');
  }
  return (
    <Flex isFullWidth direction="column" gap={5} padding={3} className="full-h">
      <ProfileProvider profile={profile}>
        <Navbar />
        {children}
      </ProfileProvider>
    </Flex>
  );
}
