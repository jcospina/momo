'use client';

import type { Profile } from '@lib-types/profile';
import { createContext, type PropsWithChildren, use, useContext } from 'react';

const Context = createContext<Promise<Profile | null> | null>(null);

interface ProfileProviderProps {
  /**
   * The signed-in user's profile, still loading. The layout hands over the
   * promise instead of awaiting it so the page shell can stream at once;
   * readers suspend until it resolves.
   */
  profile: Promise<Profile | null>;
}
export function ProfileProvider({
  profile,
  children,
}: PropsWithChildren<ProfileProviderProps>) {
  return <Context.Provider value={profile}>{children}</Context.Provider>;
}

/** Suspends until the profile has loaded. */
export function useProfile(): Profile | null {
  const profile = useContext(Context);
  return profile ? use(profile) : null;
}
