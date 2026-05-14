'use client';

import { ChatMessage as ChatMessageItem } from '@components/chat/chat-message';
import { SendButton } from '@components/chat/send-button';
import { ExpenseDetailsDialog } from '@components/expense-details/expense-details-dialog';
import { useChatPanel } from '@features/chat/hooks/use-chat-panel';
import type { ChatMessage } from '@lib-types/chat';
import { Flex } from '@ui/flex/flex';
import { FlexItem } from '@ui/flex-item/flex-item';
import { Input } from '@ui/input/input';
import { format, getYear, isToday, isYesterday } from 'date-fns';
import type React from 'react';
import { useState } from 'react';
import styles from './chat.module.css';
import { ChatDateSeparator } from './chat-date-separator';
import { ChatList } from './chat-list';
import { MomoStreamItem } from './momo-stream-item';

type ChatPanelProps = {
  scope: 'personal' | 'household';
  userId: string;
  isActive: boolean;
  householdId?: string | null;
  initialMessages: ChatMessage[];
};

function formatDateSeparatorLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (getYear(date) === getYear(new Date())) return format(date, 'EEE, MMM d');
  return format(date, 'EEE, MMM d, yyyy');
}

export function ChatPanel({
  scope,
  userId,
  isActive,
  householdId = null,
  initialMessages,
}: ChatPanelProps) {
  const panel = useChatPanel({
    scope,
    userId,
    householdId,
    initialMessages,
    isActive,
  });

  const [mountedAt] = useState(() => Date.now());

  return (
    <Flex
      direction="column"
      isFullWidth
      isFullHeight
      style={{ display: isActive ? 'flex' : 'none', minHeight: 0 }}
    >
      <FlexItem
        grow={1}
        padding={0}
        className="full-w"
        style={{ minHeight: 0 }}
      >
        <ChatList
          messages={panel.messages}
          hasMore={panel.hasMore}
          isLoadingMore={panel.isLoadingMore}
          onLoadMore={panel.loadOlder}
          currentUserId={userId}
          renderMessage={(msg, prevMsg) => {
            const msgDate = new Date(msg.created_at);
            const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
            const showSeparator =
              !prevDate || msgDate.toDateString() !== prevDate.toDateString();
            const pendingStream = panel.pendingStreams.get(msg.id);
            return (
              <Flex direction="column" isFullWidth>
                {showSeparator && (
                  <ChatDateSeparator
                    label={formatDateSeparatorLabel(msgDate)}
                  />
                )}
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  currentUserId={userId}
                  isHousehold={panel.isHousehold}
                  onDelete={panel.onDelete}
                  onRetrySend={panel.onRetrySend}
                  onOpenExpenseDetails={panel.onOpenExpenseDetails}
                  deleteError={Boolean(panel.deleteErrors[msg.id])}
                  skipMountAnimation={
                    new Date(msg.created_at).getTime() < mountedAt
                  }
                />
                {pendingStream ? (
                  <Flex marginTop={1} isFullWidth>
                    <MomoStreamItem state={pendingStream} />
                  </Flex>
                ) : null}
              </Flex>
            );
          }}
        />
      </FlexItem>
      <Flex
        as="form"
        paddingX={1}
        paddingY={2}
        isFullWidth
        gap={1}
        onSubmit={panel.handleSubmit}
      >
        <Input
          multiline
          autoResize
          minRows={1}
          maxRows={3}
          value={panel.draft}
          onChange={(
            event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
          ) => panel.setDraft(event.target.value)}
          onKeyDown={panel.handleKeyDown}
          suffix={<SendButton />}
          className={styles['momo-chat__input']}
        />
      </Flex>
      <ExpenseDetailsDialog
        controller={panel.expenseDetailsDialog}
        messageId={panel.expenseDetailsMessageId}
        onSaved={panel.onExpenseDetailsSaved}
      />
    </Flex>
  );
}
