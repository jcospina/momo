'use client';

import { ExpenseDetailsDialog } from '@components/expense-details/expense-details-dialog';
import { useChatPanel } from '@features/chat/hooks/use-chat-panel';
import {
  type ExpenseLine,
  totalsByCurrency,
} from '@features/chat/lib/expense-lines';
import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseRecord } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';
import { Button } from '@ui/button/button';
import { Dialog, useDialogController } from '@ui/dialog/dialog';
import { isMomoMessage } from '@utils/chat-message';
import { firstName } from '@utils/user';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { ChatComposer } from './chat-composer';
import { ChatEmpty } from './chat-empty';
import { dayKey, isSameDay } from './chat-format';
import { ChatHeader, type ChatScope, type ScopeSwitch } from './chat-header';
import { ChatList } from './chat-list';
import { ChatRow, type ChatRowProps, type RowAuthor } from './chat-row';
import styles from './color-tickets.module.css';

/** Messages from one person within this gap share a face and a timestamp. */
const GROUP_GAP_MS = 5 * 60 * 1000;

type ChatPanelProps = {
  scope: ChatScope;
  userId: string;
  isActive: boolean;
  householdId?: string | null;
  initialMessages: ChatMessage[];
  initialLines?: Record<string, ExpenseRecord[]>;
  title: string;
  /** Faces in the header: everyone in this chat. */
  people: RowAuthor[];
  /** Household members by user id, for faces and colours on their rows. */
  membersById: ReadonlyMap<string, RowAuthor>;
  scopeSwitch?: ScopeSwitch;
};

function authorKey(message: ChatMessage): string {
  return isMomoMessage(message) ? 'momo' : message.user_id;
}

function startsGroup(
  previous: ChatMessage | undefined,
  current: ChatMessage,
  previousHasStream: boolean,
): boolean {
  if (!previous || previousHasStream) return true;
  if (authorKey(previous) !== authorKey(current)) return true;
  if (!isSameDay(previous.created_at, current.created_at)) return true;
  const gap =
    new Date(current.created_at).getTime() -
    new Date(previous.created_at).getTime();
  return gap > GROUP_GAP_MS;
}

type RowLayout = Pick<
  ChatRowProps,
  'isGroupStart' | 'isGroupEnd' | 'dayDivider' | 'top'
>;

/** Grouping, day dividers (with day totals) and the history notice. */
function layoutRows(
  messages: ChatMessage[],
  linesByMessageId: ReadonlyMap<string, ExpenseLine[]>,
  streamIds: ReadonlySet<string>,
  history: { hasMore: boolean; isLoadingMore: boolean },
): Map<string, RowLayout> {
  const linesByDay = new Map<string, ExpenseLine[]>();
  for (const message of messages) {
    const lines = linesByMessageId.get(message.id);
    if (!lines?.length) continue;
    const key = dayKey(message.created_at);
    linesByDay.set(key, [...(linesByDay.get(key) ?? []), ...lines]);
  }
  const totalsByDay = new Map<string, Map<SupportedCurrency, number>>();
  for (const [key, lines] of linesByDay) {
    totalsByDay.set(key, totalsByCurrency(lines));
  }

  const layout = new Map<string, RowLayout>();
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const next = messages[index + 1];
    const hasStream = streamIds.has(message.id);
    const isNewDay =
      !previous || !isSameDay(previous.created_at, message.created_at);
    const isGroupStart =
      isNewDay ||
      startsGroup(
        previous,
        message,
        Boolean(previous && streamIds.has(previous.id)),
      );
    const isGroupEnd =
      !next ||
      hasStream ||
      startsGroup(message, next, false) ||
      !isSameDay(message.created_at, next.created_at);
    let top: RowLayout['top'] = null;
    if (index === 0) {
      if (history.isLoadingMore) top = 'loading';
      else if (!history.hasMore) top = 'start';
    }
    layout.set(message.id, {
      isGroupStart,
      isGroupEnd,
      dayDivider: isNewDay
        ? {
            iso: message.created_at,
            totals: totalsByDay.get(dayKey(message.created_at)) ?? new Map(),
          }
        : null,
      top,
    });
  });
  return layout;
}

export function ChatPanel({
  scope,
  userId,
  isActive,
  householdId = null,
  initialMessages,
  initialLines,
  title,
  people,
  membersById,
  scopeSwitch,
}: ChatPanelProps) {
  const t = useTranslations('chat.message');
  const panel = useChatPanel({
    scope,
    userId,
    householdId,
    initialMessages,
    isActive,
    initialLines,
  });
  const [mountedAt] = useState(() => Date.now());
  const deleteDialog = useDialogController();
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);

  const { messages, linesByMessageId, pendingStreams, hasMore, isLoadingMore } =
    panel;

  const layout = useMemo(
    () =>
      layoutRows(messages, linesByMessageId, new Set(pendingStreams.keys()), {
        hasMore,
        isLoadingMore,
      }),
    [hasMore, isLoadingMore, linesByMessageId, messages, pendingStreams],
  );

  const authorOf = (message: ChatMessage): RowAuthor =>
    membersById.get(message.user_id) ?? {
      name: firstName(message.sender_name, null) || message.sender_name,
      slot: null,
    };

  const openDelete = (message: ChatMessage) => {
    setPendingDelete(message);
    deleteDialog.openDialog();
  };

  const confirmDelete = () => {
    deleteDialog.closeDialog();
    if (pendingDelete) panel.onDelete(pendingDelete);
    setPendingDelete(null);
  };

  return (
    <section
      className={styles.surface}
      style={{ display: isActive ? 'flex' : 'none' }}
      aria-label={title}
    >
      <ChatHeader title={title} people={people} scopeSwitch={scopeSwitch} />
      <div className={styles.body}>
        <ChatList
          messages={messages}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={panel.loadOlder}
          currentUserId={userId}
          isActive={isActive}
          innerClassName={styles.inner}
          renderMessage={message => {
            const rowLayout = layout.get(message.id);
            const isOwn = !isMomoMessage(message) && message.user_id === userId;
            return (
              <ChatRow
                message={message}
                lines={linesByMessageId.get(message.id)}
                isOwn={isOwn}
                author={isOwn ? null : authorOf(message)}
                isGroupStart={rowLayout?.isGroupStart ?? true}
                isGroupEnd={rowLayout?.isGroupEnd ?? true}
                dayDivider={rowLayout?.dayDivider ?? null}
                top={rowLayout?.top ?? null}
                stream={pendingStreams.get(message.id)}
                hasDeleteError={Boolean(panel.deleteErrors[message.id])}
                pickError={Boolean(panel.pickErrors[message.id])}
                isFresh={new Date(message.created_at).getTime() > mountedAt}
                onEdit={panel.onOpenExpenseDetails}
                onDelete={openDelete}
                onRetry={panel.onRetrySend}
                onPick={panel.onPickCategory}
              />
            );
          }}
        />
        {messages.length === 0 ? <ChatEmpty /> : null}
      </div>
      <ChatComposer
        draft={panel.draft}
        onDraftChange={panel.setDraft}
        onKeyDown={panel.handleKeyDown}
        onSubmit={panel.handleSubmit}
      />
      <ExpenseDetailsDialog
        controller={panel.expenseDetailsDialog}
        messageId={panel.expenseDetailsMessageId}
        onSaved={panel.onExpenseDetailsSaved}
      />
      <Dialog
        controller={deleteDialog}
        title={t('deleteTitle')}
        content={t('deleteConfirmBody')}
        actions={
          <>
            <Button variant="secondary" onClick={deleteDialog.closeDialog}>
              {t('cancel')}
            </Button>
            <Button variant="primary" onClick={confirmDelete}>
              {t('confirm')}
            </Button>
          </>
        }
      />
    </section>
  );
}
