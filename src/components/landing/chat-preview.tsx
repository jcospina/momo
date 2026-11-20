'use client';

import { ChatRow, type RowAuthor } from '@components/chat/chat-row';
import type { ExpenseLine } from '@features/chat/lib/expense-lines';
import type { ChatMessage } from '@lib-types/chat';
import type { ExpenseCategory } from '@lib-types/expenses';
import type { SupportedCurrency } from '@lib-types/user-preferences';

/**
 * The landing's chat previews render the real chat rows and tickets, so the
 * sample copy is turned into the same shapes the chat reads from the server.
 */

/** How the landing copy describes a parsed expense (`landing.*` messages). */
export type PreviewExpense = {
  descriptor: string;
  amountMinor: number;
  currency: SupportedCurrency;
  category: ExpenseCategory;
};

/** A message from the landing copy; plain chat has no `expense`. */
export type PreviewSample = {
  text: string;
  /** 24-hour "HH:mm"; rows show it in the reader's own time format. */
  time: string;
  expense?: PreviewExpense;
};

/** The reader's colour slot (left ring slice). */
export const PREVIEW_ME_SLOT = 1;
/** The other household member's colour slot (right ring slice). */
export const PREVIEW_PARTNER_SLOT = 2;

/**
 * Local time with no offset, so server and browser render the same
 * `dateTime` attribute and the same clock time.
 */
function previewTimestamp(time: string): string {
  return `2026-01-15T${time}:00`;
}

/** Until it is processed, a message shows the way a just-sent one does. */
export function previewMessage(
  id: string,
  sample: PreviewSample,
  isProcessed: boolean,
): ChatMessage {
  let status: ChatMessage['status'] = 'pending';
  if (isProcessed) status = sample.expense ? 'processed' : 'no_expense';
  return {
    id,
    household_id: null,
    user_id: id,
    content: sample.text,
    status,
    expense_count: sample.expense ? 1 : 0,
    created_at: previewTimestamp(sample.time),
    sender_name: null,
    author_kind: 'user',
    momo_source: null,
    momo_invocation_tagged: false,
    idempotency_key: null,
  };
}

export function previewLines(
  id: string,
  sample: PreviewSample,
): ExpenseLine[] | undefined {
  if (!sample.expense) return undefined;
  const { descriptor, amountMinor, currency, category } = sample.expense;
  return [
    {
      id: `${id}-line`,
      descriptor,
      amountMinor,
      currency,
      category,
      merchant: null,
      expenseDate: previewTimestamp(sample.time),
    },
  ];
}

function ignore() {
  // Preview rows are read-only.
}

type PreviewChatRowProps = {
  id: string;
  sample: PreviewSample;
  /** Who wrote it; `null` for the reader's own messages. */
  author: RowAuthor | null;
  isProcessed: boolean;
  isGroupStart: boolean;
  isGroupEnd: boolean;
  /** Animate it in, like a message that just arrived. */
  isFresh: boolean;
};

/**
 * A read-only chat row. Its controls do nothing, so render it inside an
 * `inert` container.
 */
export function PreviewChatRow({
  id,
  sample,
  author,
  isProcessed,
  isGroupStart,
  isGroupEnd,
  isFresh,
}: PreviewChatRowProps) {
  return (
    <ChatRow
      message={previewMessage(id, sample, isProcessed)}
      lines={isProcessed ? previewLines(id, sample) : undefined}
      isOwn={author === null}
      author={author}
      isGroupStart={isGroupStart}
      isGroupEnd={isGroupEnd}
      dayDivider={null}
      top={null}
      stream={undefined}
      hasDeleteError={false}
      pickError={false}
      isFresh={isFresh}
      onEdit={ignore}
      onDelete={ignore}
      onRetry={ignore}
      onPick={ignore}
    />
  );
}
