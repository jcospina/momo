import type { MomoError } from '@lib-types/errors';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import styles from '@/app/invite/invite.module.css';
import { getInviteInfo, startAcceptFlow } from '@/lib/data/invites/server';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Highlight } from '@/ui/highlight/highlight';
import { Logo } from '@/ui/logo/logo';
import { Margin } from '@/ui/margin/margin';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

async function InvalidState({
  titleKey,
  errorCode,
}: {
  titleKey: 'notFound' | 'full';
  errorCode: MomoError;
}) {
  const t = await getTranslations('invite');
  const tErrors = await getTranslations('errors');
  return (
    <Panel padding={3}>
      <Margin marginBottom={3}>
        <Logo className={styles['invite-page__logo--error']} />
      </Margin>
      <Flex isFullHeight isFullWidth direction="column" gap={3}>
        <Typography as="h1" size="xxl" weight="bold">
          {t(titleKey)}
        </Typography>
        <Typography as="p" size="lg">
          {tErrors(errorCode)}
        </Typography>
        <Button variant="primary" asLink href="/login">
          {t('goToLogin')}
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
  const t = await getTranslations('invite');

  if (!info || info.status === 'household_invalid') {
    return <InvalidState titleKey="notFound" errorCode="household_invalid" />;
  }

  if (info.status === 'no_household' || !info.household_id) {
    return <InvalidState titleKey="notFound" errorCode="no_household" />;
  }

  if (info.status === 'household_full') {
    return <InvalidState titleKey="full" errorCode="household_full" />;
  }

  const inviter = info.inviter_name || 'Someone';
  const householdName = info.household_name ?? 'their household';

  return (
    <Panel padding={3} className={styles['invite-page__panel']}>
      <Margin marginBottom={4}>
        <Logo className={styles['invite-page__logo']} />
      </Margin>
      <Flex direction="column" gap={3}>
        {info.member_count && info.member_count > 1 ? (
          <Typography as="p" size="lg">
            {t.rich('joinHeading', {
              inviter,
              count: info.member_count - 1,
              household: householdName,
              b: chunks => (
                <Highlight variant="warm" rotation="none">
                  {chunks}
                </Highlight>
              ),
              highlight: chunks => (
                <Highlight variant="feature" rotation="none">
                  {chunks}
                </Highlight>
              ),
            })}
          </Typography>
        ) : (
          <Typography as="p" size="lg">
            {t.rich('joinHeadingSingle', {
              inviter,
              household: householdName,
              b: chunks => (
                <Highlight variant="warm" rotation="none">
                  {chunks}
                </Highlight>
              ),
              highlight: chunks => (
                <Highlight variant="feature" rotation="none">
                  {chunks}
                </Highlight>
              ),
            })}
          </Typography>
        )}
        <form>
          <Button
            variant="primary"
            formAction={startAcceptFlow.bind(null, token)}
          >
            {t('joinWithGoogle')}
          </Button>
        </form>
      </Flex>
    </Panel>
  );
}
