import { Navbar } from '@/components/navbar/navbar';
import { Avatar } from '@/ui/avatar/avatar';
import { Button } from '@/ui/button/button';
import { FlexItem } from '@/ui/flex-item/flex-item';
import { Flex } from '@/ui/flex/flex';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import { logout } from '@actions/logout';
import {
  fetchHouseholdMembers,
  getHouseholdForUser,
} from '@helpers/households';
import { getUserProfile } from '@helpers/profiles';
import { getCurrentUser } from '@helpers/user';
import { getUserPreferences } from '@helpers/user-prefs';
import { redirect } from 'next/navigation';

import { AIEnabled } from '@/app/home/profile/ai-enabled';
import { HouseholdForm } from '@/components/household-form/household-form';
import { Divider } from '@/ui/divider/divider';
import { createHouseholdInline } from '@actions/households';
import { createSupabaseServerClient } from '@lib-supabase/server';
import { firstName } from '@utils/user';
import { CurrencySelect } from './currency-select';
import { InviteLink } from './invite-link';
import { LanguageSelect } from './language-select';
import { MemberList } from './member-list';

import { ERROR_MESSAGES } from '@/lib/constants/errors';
import type { MomoError } from '@lib-types/errors';
import styles from './profile.module.css';

function buildShareUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return `${base}/invite/${token}`;
}

type ProfilePageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect('/');
  }

  const prefs = await getUserPreferences(user.id);

  const displayName = profile.display_name;
  const shareUrl = buildShareUrl(profile.invite_token);
  const household = await getHouseholdForUser(user.id);
  const supabase = await createSupabaseServerClient();
  const members = household
    ? await fetchHouseholdMembers(supabase, household.id)
    : [];
  const isOwner = household ? household.owner === user.id : false;
  const isFull = members.length >= 5;

  return (
    <Flex direction="column" padding={3} gap={5}>
      <Navbar />
      <Panel className={styles['profile__panel']}>
        <Flex
          gap={2}
          padding={3}
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography as="label" size="xl" weight="bold">
            Profile
          </Typography>
          <Flex alignItems="center" gap={2}>
            <FlexItem shrink={0}>
              <Avatar displayName={displayName || '?'} size="small" />
            </FlexItem>
            <Typography as="h3" size="lg">
              {firstName(displayName, profile.email || null)}
            </Typography>
          </Flex>
        </Flex>
        <Divider thickness="thick" />
        {household ? (
          <>
            <Flex
              direction="column"
              justifyContent="space-around"
              padding={3}
              gap={2}
            >
              <Typography size="lg" weight="bold">
                {household.name}
              </Typography>
              <MemberList userEmail={profile.email} members={members} />
              {isOwner && !isFull ? <InviteLink url={shareUrl} /> : null}
            </Flex>
          </>
        ) : (
          <>
            <Flex
              direction="column"
              justifyContent="space-around"
              padding={3}
              gap={1}
            >
              <Typography size="sm">
                It seems you don&apos;t have a household yet. If you decided
                sharing with family is good, then create one below
              </Typography>
              <Flex
                isFullWidth
                direction="column"
                justifyContent="space-around"
                gap={2}
              >
                <Typography size="xl" weight="bold">
                  Create a household
                </Typography>
                <HouseholdForm action={createHouseholdInline} />
              </Flex>
            </Flex>
          </>
        )}
        <Divider />
        <Flex direction="column" padding={3} gap={2}>
          <Typography size="lg" weight="bold">
            Settings
          </Typography>
          <CurrencySelect value={prefs?.currency ?? null} />
          <LanguageSelect value={prefs?.language ?? null} />
          <AIEnabled value={prefs?.ai_enabled || false} />
        </Flex>
        <Divider />
        <Flex padding={3} direction="column" gap={2}>
          <form>
            <Button variant="secondary" formAction={logout}>
              Logout
            </Button>
          </form>
          {error && (
            <Typography size="sm" className="momo-error">
              {ERROR_MESSAGES[error]}
            </Typography>
          )}
        </Flex>
      </Panel>
    </Flex>
  );
}
