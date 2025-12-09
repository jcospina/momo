import { Logo } from '@/ui/logo/logo';
import { Panel } from '@/ui/panel/panel';
import { setOnboardingStatus } from '@actions/user-prefs';
import { getHouseholdMembershipForUser } from '@helpers/households';
import { getCurrentUser } from '@helpers/user';
import { redirect } from 'next/navigation';

import { HouseholdForm } from '@/components/household-form/household-form';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Tooltip } from '@/ui/tooltip/tooltip';
import { Typography } from '@/ui/typography/typography';
import styles from './onboarding.module.css';

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const membership = await getHouseholdMembershipForUser(user.id);

  if (membership) {
    redirect('/home');
  }

  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      className={styles['onboarding']}
      padding={4}
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
          <Typography>
            Let&apos;s set up your household so you can start tracking expenses
            together with your loved ones.
          </Typography>
          <HouseholdForm />
          <Tooltip
            className={styles['onboarding__skip-link']}
            label="You don't want to share your spending habits with your family, I respect that and won't judge."
          >
            <form>
              <Button
                variant="link"
                formAction={setOnboardingStatus.bind(null, 'skipped')}
              >
                Skip household creation.
              </Button>
            </form>
          </Tooltip>
        </Flex>
      </Panel>
    </Flex>
  );
}
