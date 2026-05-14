'use client';

import { ChatPanel } from '@components/chat/chat-panel';
import { ChatToggle } from '@components/chat/toggle/chat-toggle';
import type { ChatMessage } from '@lib-types/chat';
import { Flex } from '@ui/flex/flex';
import { FlexItem } from '@ui/flex-item/flex-item';
import { Panel } from '@ui/panel/panel';
import { useState } from 'react';
import styles from './chat.module.css';

interface ChatProps {
  householdName?: string;
  householdId?: string | null;
  userId: string;
  initialPersonalMessages: ChatMessage[];
  initialHouseholdMessages: ChatMessage[];
}

export function Chat({
  householdName,
  householdId = null,
  userId,
  initialPersonalMessages,
  initialHouseholdMessages,
}: ChatProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'household'>(
    householdId ? 'household' : 'personal',
  );

  return (
    <Flex
      direction="column"
      alignItems="stretch"
      isFullHeight
      isFullWidth
      gap={2}
      style={{ minHeight: 0 }}
    >
      {householdId ? (
        <Flex
          paddingBottom={1}
          alignItems="center"
          justifyContent="center"
          isFullWidth
        >
          <ChatToggle
            active={activeTab}
            onChange={setActiveTab}
            householdName={householdName}
          />
        </Flex>
      ) : null}
      <FlexItem grow={1} shrink={1} style={{ minWidth: 0, minHeight: 0 }}>
        <Panel marginBottom={2} className={styles['momo-chat']}>
          <Flex
            isFullHeight
            isFullWidth
            direction="column"
            justifyContent="space-between"
            style={{ minHeight: 0 }}
          >
            <ChatPanel
              scope="household"
              userId={userId}
              householdId={householdId}
              isActive={activeTab === 'household'}
              initialMessages={initialHouseholdMessages}
            />
            <ChatPanel
              scope="personal"
              userId={userId}
              isActive={activeTab === 'personal'}
              initialMessages={initialPersonalMessages}
            />
          </Flex>
        </Panel>
      </FlexItem>
    </Flex>
  );
}
