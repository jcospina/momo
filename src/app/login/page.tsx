import { Toast } from '@components/toast/toast';
import { ERROR_MESSAGES } from '@constants/errors';
import type { MomoError } from '@lib-types/errors';
import { loginWithProvider } from '@/lib/data/auth/server';
import { Button } from '@/ui/button/button';
import { Flex } from '@/ui/flex/flex';
import { Logo } from '@/ui/logo/logo';
import { Panel } from '@/ui/panel/panel';
import { Typography } from '@/ui/typography/typography';
import styles from './login.module.css';

type LoginPageProps = {
  searchParams: Promise<{ error?: MomoError }>;
};

export default async function Home({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  console.log(error);
  return (
    <Flex
      direction="column"
      alignItems="center"
      justifyContent="center"
      gap={4}
      padding={4}
      className={styles['login']}
    >
      <Panel padding={6}>
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
      {error && <Toast variant="error">{ERROR_MESSAGES[error]}</Toast>}
    </Flex>
  );
}
