import type { Profile } from '@lib-types/profile';
import type { AuthUser, PostgrestError } from '@supabase/supabase-js';

export type ProfileRecord = Profile;

export type GetProfile = (userId: string) => Promise<ProfileRecord | null>;
export type CreateProfile = (user: AuthUser) => Promise<PostgrestError | null>;
