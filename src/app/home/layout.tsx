import type { Profile } from '@lib-types/profile';
import { ProfileProvider } from '@providers/profile-provider';
import { RealtimeClientProvider } from '@providers/realtime-client-provider';
import type { ReactNode } from 'react';
import { getCurrentUserId } from '@/lib/data/auth/server';
import { getProfile } from '@/lib/data/profile/server';

async function loadCurrentProfile(): Promise<Profile | null> {
  const userId = await getCurrentUserId();
  return userId ? getProfile(userId) : null;
}

// Deliberately synchronous: nothing here waits on the database, so the page
// shell (navbar and a skeleton) streams in the first response chunk. The
// profile is handed down as a promise; pages await it with their own data
// and send anyone without a session or profile to /login, as this layout
// used to.
export default function HomeLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <RealtimeClientProvider>
      <ProfileProvider profile={loadCurrentProfile()}>
        {children}
      </ProfileProvider>
    </RealtimeClientProvider>
  );
}
