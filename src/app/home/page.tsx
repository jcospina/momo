import { Chat } from '@components/chat/chat';
import { Flex } from '@ui/flex/flex';
import { FlexItem } from '@ui/flex-item/flex-item';
import { redirect } from 'next/navigation';
import { Navbar } from '@/components/navbar/navbar';
import { getCurrentUser } from '@/lib/data/auth/server';
import { getHouseholdForUser } from '@/lib/data/households/server';
import { getList as getChatMessages } from '@/lib/data/messages/server';
import styles from './home.module.css';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const householdPromise = getHouseholdForUser(user.id);
  const personalPromise = getChatMessages({
    householdId: null,
    userId: user.id,
    limit: 30,
  });

  const household = await householdPromise;
  const householdMessagesPromise = household
    ? getChatMessages({
        householdId: household.id,
        userId: user.id,
        limit: 30,
      })
    : Promise.resolve([]);

  const [personalMessages, householdMessages] = await Promise.all([
    personalPromise,
    householdMessagesPromise,
  ]);

  return (
    <Flex className={styles['home']} direction="column" padding={3} gap={5}>
      <Navbar />
      <FlexItem grow={1} shrink={1} className={styles['home__content']}>
        <Chat
          userId={user.id}
          householdId={household?.id ?? null}
          householdName={household?.name}
          initialPersonalMessages={personalMessages.reverse()}
          initialHouseholdMessages={householdMessages.reverse()}
        />
      </FlexItem>
    </Flex>
  );
}
