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
import { redirect } from 'next/navigation';

import { HouseholdForm } from '@/components/household-form/household-form';
import { Divider } from '@/ui/divider/divider';
import { createHouseholdInline } from '@actions/households';
import { createSupabaseServerClient } from '@supabase/server';
import { firstName } from '@utils/user';
import { InviteLink } from './invite-link';
import { MemberList } from './member-list';

import styles from './profile.module.css';
function buildShareUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return `${base}/invite/${token}`;
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const profile = await getUserProfile(user.id);

  if (!profile) {
    redirect('/');
  }

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
    <Panel className={styles['profile__panel']} margin="auto">
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
              Household members
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
      <Flex padding={3}>
        <form>
          <Button variant="secondary" formAction={logout}>
            Logout
          </Button>
        </form>
      </Flex>
    </Panel>
  );
}
