'use client';

import { ChatPanel } from '@components/chat/chat-panel';
import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseRecord } from '@lib-types/expenses';
import type { HouseholdMemberProfile } from '@lib-types/households';
import { useProfile } from '@providers/profile-provider';
import { Panel } from '@ui/panel/panel';
import { firstName } from '@utils/user';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import styles from './chat.module.css';
import type { ChatScope, ScopeSwitch } from './chat-header';
import type { RowAuthor } from './chat-row';

interface ChatProps {
  householdName?: string;
  householdId?: string | null;
  userId: string;
  initialPersonalMessages: ChatMessage[];
  initialHouseholdMessages: ChatMessage[];
  /** Expense lines for the initial messages, keyed by message id. */
  initialExpenseLines?: Record<string, ExpenseRecord[]>;
  /** Household members with their fixed colour slots. */
  members?: HouseholdMemberProfile[];
}

function toAuthor(member: HouseholdMemberProfile): RowAuthor {
  return {
    name: firstName(member.display_name, member.email),
    slot: member.color_slot ?? null,
  };
}

export function Chat({
  householdName,
  householdId = null,
  userId,
  initialPersonalMessages,
  initialHouseholdMessages,
  initialExpenseLines,
  members = [],
}: ChatProps) {
  const t = useTranslations('chat.tabs');
  const profile = useProfile();
  const [activeTab, setActiveTab] = useState<ChatScope>(
    householdId ? 'household' : 'personal',
  );

  const people = useMemo(() => {
    const membersById = new Map<string, RowAuthor>();
    for (const member of members) {
      if (member.user_id) membersById.set(member.user_id, toAuthor(member));
    }
    // Without a household you'd be its first member, so slot 1.
    const me: RowAuthor = {
      name: firstName(profile?.display_name ?? null, profile?.email ?? null),
      slot: membersById.get(userId)?.slot ?? 1,
    };
    const household = members.length
      ? [...members]
          .sort((a, b) => (a.color_slot ?? 99) - (b.color_slot ?? 99))
          .map(toAuthor)
      : [me];
    return { membersById, me, household };
  }, [members, profile?.display_name, profile?.email, userId]);

  const personalTitle = profile?.display_name?.trim() || t('personal');
  const householdTitle = householdName?.trim() || t('household');

  // The switch says "You" rather than your name: names can be long, and
  // the household side already carries the household's own name.
  const scopeSwitch: ScopeSwitch | undefined = householdId
    ? {
        active: activeTab,
        onChange: setActiveTab,
        options: [
          { value: 'personal', label: t('you') },
          { value: 'household', label: householdTitle },
        ],
      }
    : undefined;

  return (
    <Panel marginBottom={2} className={styles['momo-chat']}>
      {householdId ? (
        <ChatPanel
          scope="household"
          userId={userId}
          householdId={householdId}
          isActive={activeTab === 'household'}
          initialMessages={initialHouseholdMessages}
          initialLines={initialExpenseLines}
          title={householdTitle}
          people={people.household}
          membersById={people.membersById}
          scopeSwitch={scopeSwitch}
        />
      ) : null}
      <ChatPanel
        scope="personal"
        userId={userId}
        isActive={activeTab === 'personal'}
        initialMessages={initialPersonalMessages}
        initialLines={initialExpenseLines}
        title={personalTitle}
        people={[people.me]}
        membersById={people.membersById}
        scopeSwitch={scopeSwitch}
      />
    </Panel>
  );
}
