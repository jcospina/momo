import { Flex } from '@components/flex/flex';
import { Panel } from '@components/panel/panel';
import { Typography } from '@components/typography/typography';
import { getCurrentUser } from '@helpers/user';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return (
    <Panel padding={3}>
      <Flex isFullWidth direction="column" gap={2} alignItems="center">
        <Typography as="p">Hello {user.user_metadata?.name}</Typography>
      </Flex>
    </Panel>
  );
}
