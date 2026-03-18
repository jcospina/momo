import { ERROR_MESSAGES } from '@constants/errors';
import type { MomoError } from '@lib-types/errors';
import { redirect } from 'next/navigation';
import styles from '@/app/invite/invite.module.css';
import { getInviteInfo, startAcceptFlow } from '@/lib/data/invites/server';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Logo } from '@/ui/logo/logo';
import { Margin } from '@/ui/margin/margin';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

function InvalidState({
  title,
  errorCode,
}: {
  title: string;
  errorCode: MomoError;
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
          {ERROR_MESSAGES[errorCode]}
        </Typography>
        <Button variant="primary" asLink href="/login">
          Go to login
        </Button>
      </Flex>
    </Panel>
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  if (!token) {
    redirect('/login');
  }

  const info = await getInviteInfo(token);

  if (!info || info.status === 'household_invalid') {
    return (
      <InvalidState title="Invite not found" errorCode="household_invalid" />
    );
  }

  if (info.status === 'no_household' || !info.household_id) {
    return <InvalidState title="Invite not found" errorCode="no_household" />;
  }

  if (info.status === 'household_full') {
    return (
      <InvalidState title="Household is full" errorCode="household_full" />
    );
  }

  const inviter = info.inviter_name || 'Someone';

  return (
    <Panel padding={3} className={styles['invite-page__panel']}>
      <Margin marginBottom={4}>
        <Logo />
      </Margin>
      <Flex direction="column" gap={3}>
        {info.member_count && info.member_count > 1 ? (
          <Typography as="p" size="lg">
            Join{' '}
            <span className={styles['invite-page__hightlight']}>{inviter}</span>{' '}
            and {info.member_count - 1} others in{' '}
            <strong>{info.household_name ?? 'their household'}</strong>.
          </Typography>
        ) : (
          <Typography as="p" size="lg">
            <span className={styles['invite-page__hightlight']}>{inviter}</span>{' '}
            invited you to join{' '}
            <strong>{info.household_name ?? 'their household'}</strong>.
          </Typography>
        )}
        <form>
          <Button
            variant="primary"
            formAction={startAcceptFlow.bind(null, token)}
          >
            Join with Google
          </Button>
        </form>
      </Flex>
    </Panel>
  );
}
