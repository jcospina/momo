import type { MomoError } from '@lib-types/errors';
import { firstName } from '@utils/user';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { HouseholdForm } from '@/components/household-form/household-form';
import { AppNavbar } from '@/components/navbar/app-navbar';
import { getCurrentUser, logout } from '@/lib/data/auth/server';
import {
  createInline,
  getHouseholdForUser,
  getMembers,
} from '@/lib/data/households/server';
import { getUserPreferences } from '@/lib/data/prefs/server';
import { getProfile } from '@/lib/data/profile/server';
import { Avatar } from '@/ui/avatar/avatar';
import { Button } from '@/ui/button/button';
import { Divider } from '@/ui/divider/divider';
import { Flex } from '@/ui/flex/flex';
import { FlexItem } from '@/ui/flex-item/flex-item';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import { CurrencySelect } from './currency-select';
import { InviteLink } from './invite-link';
import { LanguageSelect } from './language-select';
import { MemberList } from './member-list';

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
  const t = await getTranslations('profile');
  const tErrors = await getTranslations('errors');
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  const profile = await getProfile(user.id);

  if (!profile) {
    redirect('/');
  }

  const prefs = await getUserPreferences(user.id);

  const displayName = profile.display_name;
  const shareUrl = buildShareUrl(profile.invite_token);
  const household = await getHouseholdForUser(user.id);
  const members = household ? await getMembers(household.id) : [];
  const isOwner = household ? household.owner === user.id : false;
  const isFull = members.length >= 5;

  return (
    <Flex direction="column" padding={3} gap={5}>
      <AppNavbar />
      <Panel className={styles['profile__panel']}>
        <Flex
          gap={2}
          padding={3}
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography as="label" size="xl" weight="bold">
            {t('title')}
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
              <Typography size="sm">{t('noHousehold')}</Typography>
              <Flex
                isFullWidth
                direction="column"
                justifyContent="space-around"
                gap={2}
              >
                <Typography size="xl" weight="bold">
                  {t('createHousehold')}
                </Typography>
                <HouseholdForm action={createInline} />
              </Flex>
            </Flex>
          </>
        )}
        <Divider />
        <Flex direction="column" padding={3} gap={2}>
          <Typography size="lg" weight="bold">
            {t('settings')}
          </Typography>
          <CurrencySelect value={prefs?.currency ?? null} />
          <LanguageSelect value={prefs?.language ?? null} />
          {/* <AIEnabled value={prefs?.ai_enabled || false} /> */}
        </Flex>
        <Divider />
        <Flex padding={3} direction="column" gap={2}>
          <form>
            <Button variant="secondary" formAction={logout}>
              {t('logout')}
            </Button>
          </form>
          {error && (
            <Typography size="sm" className="momo-error">
              {tErrors(error)}
            </Typography>
          )}
        </Flex>
      </Panel>
    </Flex>
  );
}
