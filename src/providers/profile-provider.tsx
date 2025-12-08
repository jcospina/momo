'use client';

import type { Profile } from '@lib-types/profile';
import { createContext, useContext, type PropsWithChildren } from 'react';

const Context = createContext<Profile | null>(null);

interface ProfileProviderProps {
  profile: Profile;
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
