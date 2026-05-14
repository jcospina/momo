'use client';

import type { ChatMessage as ChatMessageRecord } from '@lib-types/chat';
import { Avatar } from '@ui/avatar/avatar';
import { Button } from '@ui/button/button';
import { Dialog, useDialogController } from '@ui/dialog/dialog';
import { AlertIcon } from '@ui/icons/alert';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { Margin } from '@ui/margin/margin';
import { Menu } from '@ui/menu/menu';
import { Typography } from '@ui/typography/typography';
import { isMomoMessage } from '@utils/chat-message';
import { cn } from '@utils/cn';
import { firstName } from '@utils/user';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import styles from './chat-message.module.css';
import { ChatMessageBubble } from './chat-message-bubble';

type StatusTone = 'error' | 'warning' | 'expense';

type StatusKind =
  | 'retry_send'
  | 'needs_category'
  | 'expense_created'
  | 'expense_failed';

type StatusDisplay = {
  kind: StatusKind;
  tone: StatusTone;
  expenseCount?: number;
};

type ChatMessageProps = {
  message: ChatMessageRecord;
  currentUserId: string;
  isHousehold: boolean;
  onDelete?: (message: ChatMessageRecord) => void;
  onRetrySend?: (message: ChatMessageRecord) => void;
  onOpenExpenseDetails?: (message: ChatMessageRecord) => void;
  deleteError?: boolean;
  skipMountAnimation?: boolean;
};

function getStatusDisplay(
  message: ChatMessageRecord,
  isOwn: boolean,
): StatusDisplay | null {
  const isLocalOnly = message.id.startsWith('tmp-');
  const isLocalError = isLocalOnly && message.status === 'failed';
  const isFailed = message.status === 'failed';
  const hasExpenses = message.expense_count > 0;
  const needsCategory = message.status === 'needs_category';

  if (!isOwn) {
    if (hasExpenses) {
      return {
        kind: 'expense_created',
        tone: 'expense',
        expenseCount: message.expense_count,
      };
    }
    return null;
  }

  if (isLocalError) {
    return { kind: 'retry_send', tone: 'error' };
  }

  if (isFailed) {
    return { kind: 'expense_failed', tone: 'error' };
  }

  if (needsCategory) {
    return { kind: 'needs_category', tone: 'warning' };
  }

  if (hasExpenses) {
    return {
      kind: 'expense_created',
      tone: 'expense',
      expenseCount: message.expense_count,
    };
  }

  return null;
}

type StatusButtonProps = {
  label: string;
  className: string;
  onClick: () => void;
};

function RetrySendButton({ label, className, onClick }: StatusButtonProps) {
  return (
    <Menu items={[{ type: 'item', label, onSelect: onClick }]}>
      <Button
        type="button"
        variant="icon"
        className={className}
        aria-label={label}
      >
        <AlertIcon width={18} height={18} />
      </Button>
    </Menu>
  );
}

function NeedsCategoryButton({ label, className, onClick }: StatusButtonProps) {
  return (
    <Button
      type="button"
      variant="icon"
      className={className}
      onClick={onClick}
      aria-label={label}
    >
      <AlertIcon width={18} height={18} />
    </Button>
  );
}

function ExpenseFailedButton({ label, className, onClick }: StatusButtonProps) {
  return (
    <Button
      type="button"
      variant="icon"
      className={className}
      onClick={onClick}
      aria-label={label}
    >
      <AlertIcon width={18} height={18} />
    </Button>
  );
}

function ExpenseCreatedButton({
  label,
  className,
  onClick,
}: StatusButtonProps) {
  return (
    <Button
      type="button"
      variant="icon"
      className={className}
      onClick={onClick}
      aria-label={label}
    >
      <CircleCheckIcon width={18} height={18} />
    </Button>
  );
}

type ActionsTriggerButtonProps = {
  onDelete: () => void;
  onEdit: () => void;
  ariaLabel: string;
  editLabel: string;
  deleteLabel: string;
};

function ActionsTriggerButton({
  onDelete,
  onEdit,
  ariaLabel,
  editLabel,
  deleteLabel,
}: ActionsTriggerButtonProps) {
  return (
    <Menu
      items={[
        { type: 'item', label: editLabel, onSelect: onEdit },
        {
          type: 'item',
          label: deleteLabel,
          tone: 'danger',
          onSelect: onDelete,
        },
      ]}
    >
      <Button
        type="button"
        variant="icon"
        className={cn(
          styles['momo-chat__icon-button'],
          styles['momo-chat__actions-trigger'],
        )}
        aria-label={ariaLabel}
      >
        <ThreeDotsIcon width={16} height={16} />
      </Button>
    </Menu>
  );
}

export function ChatMessage({
  message,
  currentUserId,
  isHousehold,
  onDelete,
  onRetrySend,
  onOpenExpenseDetails,
  deleteError = false,
  skipMountAnimation = false,
}: ChatMessageProps) {
  const tChat = useTranslations('chat');
  const isMomo = isMomoMessage(message);
  const isOwn = !isMomo && message.user_id === currentUserId;
  const showActions = isOwn;
  const senderNameRaw =
    isHousehold && !isOwn && !isMomo ? (message.sender_name ?? null) : null;
  const showAvatar = isHousehold && !isOwn && !isMomo;
  const timestamp = message.created_at
    ? format(new Date(message.created_at), 'p')
    : null;
  const senderDisplay = senderNameRaw
    ? firstName(senderNameRaw, null) || senderNameRaw
    : null;

  const status = isMomo ? null : getStatusDisplay(message, isOwn);
  const deleteDialog = useDialogController();

  const handleRetrySend = () => {
    onRetrySend?.(message);
  };
  const handleOpenExpenseDetails = () => {
    if (!isOwn) return;
    onOpenExpenseDetails?.(message);
  };
  const handleDelete = () => {
    deleteDialog.closeDialog();
    onDelete?.(message);
  };

  const baseStatusClass = cn(
    styles['momo-chat__icon-button'],
    styles['momo-chat__status-icon'],
  );
  const statusClassName = status?.tone
    ? cn(baseStatusClass, styles[`momo-chat__status-icon--${status.tone}`])
    : baseStatusClass;

  const statusLabel = status
    ? status.kind === 'retry_send'
      ? tChat('status.sendFailed')
      : status.kind === 'expense_failed'
        ? tChat('status.expenseFailed')
        : status.kind === 'needs_category'
          ? tChat('status.needsCategory')
          : (status.expenseCount ?? 0) > 1
            ? tChat('status.expensesCreated')
            : tChat('status.expenseCreated')
    : '';

  const statusSlot =
    status?.kind === 'retry_send' ? (
      <RetrySendButton
        label={statusLabel}
        className={statusClassName}
        onClick={handleRetrySend}
      />
    ) : status?.kind === 'needs_category' ? (
      <NeedsCategoryButton
        label={statusLabel}
        className={statusClassName}
        onClick={handleOpenExpenseDetails}
      />
    ) : status?.kind === 'expense_failed' ? (
      <ExpenseFailedButton
        label={statusLabel}
        className={statusClassName}
        onClick={handleOpenExpenseDetails}
      />
    ) : status?.kind === 'expense_created' ? (
      <ExpenseCreatedButton
        label={statusLabel}
        className={statusClassName}
        onClick={handleOpenExpenseDetails}
      />
    ) : null;

  const actionsSlot = showActions ? (
    <ActionsTriggerButton
      onEdit={handleOpenExpenseDetails}
      onDelete={deleteDialog.openDialog}
      ariaLabel={tChat('message.actionsAriaLabel')}
      editLabel={tChat('message.edit')}
      deleteLabel={tChat('message.delete')}
    />
  ) : null;

  const avatarSlot = showAvatar ? (
    <Margin marginTop={0.5}>
      <Avatar
        size="extra-small"
        displayName={senderDisplay || senderNameRaw || '?'}
        color="mauve-magic"
      />
    </Margin>
  ) : null;

  const belowSlot = deleteError ? (
    <Typography
      as="div"
      size="sm"
      className={cn(
        styles['momo-chat__delete-error'],
        isOwn
          ? styles['momo-chat__delete-error--own']
          : styles['momo-chat__delete-error--incoming'],
      )}
    >
      {tChat('message.deleteError')}
    </Typography>
  ) : null;

  return (
    <>
      <ChatMessageBubble
        text={message.content}
        isOwn={isOwn}
        timestamp={timestamp}
        senderName={senderDisplay}
        avatarSlot={avatarSlot}
        statusSlot={statusSlot}
        actionsSlot={actionsSlot}
        belowSlot={belowSlot}
        skipMountAnimation={skipMountAnimation}
      />
      <Dialog
        controller={deleteDialog}
        title={tChat('message.deleteTitle')}
        content={tChat('message.deleteConfirmBody')}
        actions={
          <>
            <Button variant="secondary" onClick={deleteDialog.closeDialog}>
              {tChat('message.cancel')}
            </Button>
            <Button variant="primary" onClick={handleDelete}>
              {tChat('message.confirm')}
            </Button>
          </>
        }
      />
    </>
  );
}
