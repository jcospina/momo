import { Toast } from '@components/toast/toast';
import type { MomoError } from '@lib-types/errors';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { HouseholdForm } from '@/components/household-form/household-form';
import { getCurrentUser } from '@/lib/data/auth/server';
import { getMembership } from '@/lib/data/households/server';
import { setOnboardingStatus } from '@/lib/data/prefs/server';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Logo } from '@/ui/logo/logo';
import { Panel } from '@/ui/panel/panel';
import { Tooltip } from '@/ui/tooltip/tooltip';
import { Typography } from '@/ui/typography/typography';
import styles from './onboarding.module.css';

type OnboardingPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const { error } = await searchParams;

  const membership = await getMembership(user.id);

  if (membership) {
    redirect('/home');
  }

  const tOnboarding = await getTranslations('auth.onboarding');
  const tErrors = await getTranslations('errors');

  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      className={styles['onboarding']}
      padding={4}
      gap={4}
    >
      <Panel padding={3} className={styles['onboarding__panel']}>
        <Flex
          direction="column"
          justifyContent="space-around"
          alignItems="center"
          isFullHeight
          isFullWidth
        >
          <Logo />
          <Typography>{tOnboarding('householdPrompt')}</Typography>
          <HouseholdForm />
          <Tooltip
            className={styles['onboarding__skip-link']}
            label={tOnboarding('skipTooltip')}
          >
            <form>
              <Button
                variant="link"
                formAction={setOnboardingStatus.bind(null, 'skipped')}
              >
                {tOnboarding('skip')}
              </Button>
            </form>
          </Tooltip>
        </Flex>
      </Panel>
      {error && <Toast variant="error">{tErrors(error)}</Toast>}
    </Flex>
  );
}
