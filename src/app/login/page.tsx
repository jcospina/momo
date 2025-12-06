import { loginWithProvider } from '@actions/login';
import { Button } from '@components/button/button';
import { Logo } from '@components/logo/logo';
import { Panel } from '@components/panel/panel';
import { Typography } from '@components/typography/typography';

import { Flex } from '@components/flex/flex';
import styles from './login.module.css';

export default function Home() {
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      padding={4}
      className={styles['login']}
    >
      <Panel padding={6} className={styles['login__panel']}>
        <Flex
          direction="column"
          alignItems="center"
          justifyContent="space-around"
          gap={8}
        >
          <Flex
            direction="column"
            gap={0.5}
            alignItems="center"
            justifyContent="center"
            className={styles['login__header']}
          >
            <Typography>Welcome to</Typography>
            <Logo className={styles['login__logo']} />
            <Typography>More money, More fun</Typography>
          </Flex>
          <form>
            <Button
              variant="primary"
              formAction={loginWithProvider.bind(null, 'google')}
            >
              Sign in with Google
            </Button>
          </form>
        </Flex>
      </Panel>
    </Flex>
  );
}
