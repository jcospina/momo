import { Chat } from '@components/chat/chat';
import { ChatSkeleton } from '@components/chat/chat-skeleton';
import { AppNavbar, AppNavbarPlaceholder } from '@components/navbar/app-navbar';
import type { ChatMessage } from '@lib-types/chat';
import { Flex } from '@ui/flex/flex';
import { FlexItem } from '@ui/flex-item/flex-item';
import { type ReactNode, Suspense } from 'react';
import { getExpensesByMessageIds } from '@/lib/data/expenses/server';
import {
  getHouseholdForUser,
  getMembers,
  getMembership,
} from '@/lib/data/households/server';
import { getList as getChatMessages } from '@/lib/data/messages/server';
import styles from './home.module.css';
import { requireProfile, requireUserId } from './session';

const CHAT_PAGE_SIZE = 30;

function HomeFrame({
  navbar,
  children,
}: {
  navbar: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      {navbar}
      <FlexItem grow={1} shrink={1} className={styles['home__content']}>
        {children}
      </FlexItem>
    </>
  );
}

// The first response chunk carries this shell, so the navbar and the chat
// frame paint before any data is read. The chat streams into it in a single
// reveal (one Suspense boundary, so React doesn't throttle a second one).
export default function HomePage() {
  return (
    <Flex className={styles['home']} direction="column" padding={3} gap={2}>
      <Suspense
        fallback={
          <HomeFrame navbar={<AppNavbarPlaceholder />}>
            <ChatSkeleton />
          </HomeFrame>
        }
      >
        <HomeChat />
      </Suspense>
    </Flex>
  );
}

// Every visible ticket's lines in one read per scope, started as soon as
// that scope's messages arrive, so tickets render filled in.
async function loadExpenseLines(messages: Promise<ChatMessage[]>) {
  const ids = (await messages)
    .filter(m => m.author_kind === 'user' && m.expense_count > 0)
    .map(m => m.id);
  if (ids.length === 0) {
    return {};
  }
  const { expensesByMessageId } = await getExpensesByMessageIds({
    messageIds: ids,
  });
  return expensesByMessageId;
}

async function HomeChat() {
  const userId = await requireUserId();

  // Everything that only needs the user id starts now. The household's own
  // reads need just its id, so they wait on the membership row alone, not
  // on the household record.
  const membershipPromise = getMembership(userId);
  const householdPromise = getHouseholdForUser(userId);
  const personalMessagesPromise = getChatMessages({
    householdId: null,
    userId,
    limit: CHAT_PAGE_SIZE,
  });
  const householdMessagesPromise = membershipPromise.then(membership =>
    membership
      ? getChatMessages({
          householdId: membership.household_id,
          userId,
          limit: CHAT_PAGE_SIZE,
        })
      : [],
  );
  const membersPromise = membershipPromise.then(membership =>
    membership ? getMembers(membership.household_id) : [],
  );

  // The profile is awaited with the data so a missing one redirects before
  // anything renders.
  const [
    _profile,
    household,
    personalMessages,
    householdMessages,
    members,
    personalLines,
    householdLines,
  ] = await Promise.all([
    requireProfile(userId),
    householdPromise,
    personalMessagesPromise,
    householdMessagesPromise,
    membersPromise,
    loadExpenseLines(personalMessagesPromise),
    loadExpenseLines(householdMessagesPromise),
  ]);

  return (
    <HomeFrame navbar={<AppNavbar />}>
      <Chat
        userId={userId}
        householdId={household?.id ?? null}
        householdName={household?.name}
        initialPersonalMessages={personalMessages.reverse()}
        initialHouseholdMessages={householdMessages.reverse()}
        initialExpenseLines={{ ...personalLines, ...householdLines }}
        members={members}
      />
    </HomeFrame>
  );
}
