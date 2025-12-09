import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Logo } from '@/ui/logo/logo';
import { Margin } from '@/ui/margin/margin';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import { startInviteAcceptFlow } from '@actions/invites';
import { fetchInviteInfo } from '@helpers/invites';
import { createSupabaseServiceRoleClient } from '@supabase/server';
import { redirect } from 'next/navigation';

import styles from '../invite.module.css';

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

function InvalidState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Panel padding={3}>
      <Margin marginBottom={3}>
        <Logo className={styles['invite-page__logo--error']} />
      </Margin>
      <Flex isFullHeight isFullWidth direction="column" gap={3}>
        <Typography as="h1" size="xxl" weight="bold">
          {title}
        </Typography>
        <Typography as="p" size="lg">
          {description}
        </Typography>
        <Button variant="primary">Go to login</Button>
      </Flex>
    </Panel>
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  if (!token) {
    redirect('/login');
  }

  const serviceClient = createSupabaseServiceRoleClient();
  const info = await fetchInviteInfo(serviceClient, token);

  if (
    !info ||
    info.status === 'invalid' ||
    info.status === 'no_household' ||
    !info.household_id
  ) {
    return (
      <InvalidState
        title="Invite not found"
        description="Someone tricked you into believing this invite was valid. Shame on them."
      />
    );
  }

  if (info.status === 'household_full') {
    return (
      <InvalidState
        title="Household is full"
        description="It seems you arrived late..."
      />
    );
  }

  const inviter = info.inviter_name || 'Someone';

  return (
    <Panel padding={3} className={styles['invite-page__panel']}>
      <Margin marginBottom={4}>
        <Logo />
      </Margin>
      <Flex direction="column" gap={3}>
        <Typography as="p" size="lg">
          {inviter} invited you to join{' '}
          <strong>{info.household_name ?? 'their household'}</strong>.
        </Typography>
        <form action={startInviteAcceptFlow}>
          <input type="hidden" name="token" value={token} />
          <Button variant="primary" type="submit">
            Join with Google
          </Button>
        </form>
      </Flex>
    </Panel>
  );
}
