'use client';

import type { UserProfile } from '@lib-types/profile';
import { createContext, useContext, type PropsWithChildren } from 'react';

const Context = createContext<UserProfile | null>(null);

interface ProfileProviderProps {
  profile: UserProfile;
}
export function ProfileProvider({
  profile,
  children,
}: PropsWithChildren<ProfileProviderProps>) {
  return <Context.Provider value={profile}>{children}</Context.Provider>;
}

export function useProfile() {
  return useContext(Context);
}
