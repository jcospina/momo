'use client';

import type { ChatMessage as ChatMessageRecord } from '@lib-types/chat';
import { Avatar } from '@ui/avatar/avatar';
import { Button } from '@ui/button/button';
import { Dialog, useDialogController } from '@ui/dialog/dialog';
import { Flex } from '@ui/flex/flex';
import { AlertIcon } from '@ui/icons/alert';
import { CircleCheckIcon } from '@ui/icons/circle-check';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { Margin } from '@ui/margin/margin';
import { Menu } from '@ui/menu/menu';
import { Padding } from '@ui/padding/padding';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { firstName } from '@utils/user';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import styles from './chat-message.module.css';

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
};

type ChatMessageBubbleProps = {
  message: string;
  isOwn: boolean;
  senderName: string | null;
  showAvatar: boolean;
  timestamp: string | null;
  status: StatusDisplay | null;
  showActions: boolean;
  deleteError: boolean;
  onRetrySend: () => void;
  onNeedsCategory: () => void;
  onExpenseDetails: () => void;
  onExpenseFailed: () => void;
  onDelete: () => void;
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

function ChatMessageBubble({
  message,
  isOwn,
  senderName,
  showAvatar,
  timestamp,
  status,
  showActions,
  deleteError,
  onRetrySend,
  onNeedsCategory,
  onExpenseDetails,
  onExpenseFailed,
  onDelete,
}: ChatMessageBubbleProps) {
  const tChat = useTranslations('chat');
  const name = firstName(senderName, null);
  const baseStatusClass = cn(
    styles['momo-chat__icon-button'],
    styles['momo-chat__status-icon'],
  );
  const deleteDialog = useDialogController();

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

  const statusClassName = status?.tone
    ? cn(baseStatusClass, styles[`momo-chat__status-icon--${status.tone}`])
    : baseStatusClass;

  const handleConfirmDelete = () => {
    deleteDialog.closeDialog();
    onDelete();
  };

  return (
    <>
      <Flex gap={1} marginLeft={isOwn ? 'auto' : 0} alignItems="flex-start">
        {!isOwn && showAvatar ? (
          <Margin marginTop={0.5}>
            <Avatar
              size="extra-small"
              displayName={name || senderName || '?'}
              color="mauve-magic"
            />
          </Margin>
        ) : (
          <div className={styles['momo-chat__avatar-placeholder']} />
        )}
        <Flex
          direction="column"
          gap={0.5}
          className={styles['momo-chat__bubble']}
          style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}
        >
          <Padding
            as="article"
            paddingX={2}
            paddingY={1}
            className={cn(
              styles['momo-chat__message'],
              isOwn && styles['momo-chat__message--own'],
            )}
          >
            {!isOwn && senderName ? (
              <Typography
                as="div"
                size="sm"
                weight="bold"
                className={styles['momo-chat__sender']}
              >
                {name || senderName}
              </Typography>
            ) : null}
            <div className={styles['momo-chat__content-row']}>
              {status?.kind === 'retry_send' ? (
                <RetrySendButton
                  label={statusLabel}
                  className={statusClassName}
                  onClick={onRetrySend}
                />
              ) : null}
              {status?.kind === 'needs_category' ? (
                <NeedsCategoryButton
                  label={statusLabel}
                  className={statusClassName}
                  onClick={onNeedsCategory}
                />
              ) : null}
              {status?.kind === 'expense_failed' ? (
                <ExpenseFailedButton
                  label={statusLabel}
                  className={statusClassName}
                  onClick={onExpenseFailed}
                />
              ) : null}
              {status?.kind === 'expense_created' ? (
                <ExpenseCreatedButton
                  label={statusLabel}
                  className={statusClassName}
                  onClick={onExpenseDetails}
                />
              ) : null}
              <Typography
                as="p"
                size="md"
                className={styles['momo-chat__content']}
              >
                {message}
              </Typography>
              {showActions ? (
                <ActionsTriggerButton
                  onEdit={onExpenseDetails}
                  onDelete={deleteDialog.openDialog}
                  ariaLabel={tChat('message.actionsAriaLabel')}
                  editLabel={tChat('message.edit')}
                  deleteLabel={tChat('message.delete')}
                />
              ) : null}
            </div>
          </Padding>
          {timestamp ? (
            <Typography
              as="div"
              size="sm"
              className={cn(
                styles['momo-chat__timestamp'],
                isOwn
                  ? styles['momo-chat__timestamp--own']
                  : styles['momo-chat__timestamp--incoming'],
              )}
            >
              {timestamp}
            </Typography>
          ) : null}
          {deleteError ? (
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
          ) : null}
        </Flex>
      </Flex>
      <Dialog
        controller={deleteDialog}
        title={tChat('message.deleteTitle')}
        content={tChat('message.deleteConfirmBody')}
        actions={
          <>
            <Button variant="secondary" onClick={deleteDialog.closeDialog}>
              {tChat('message.cancel')}
            </Button>
            <Button variant="primary" onClick={handleConfirmDelete}>
              {tChat('message.confirm')}
            </Button>
          </>
        }
      />
    </>
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
}: ChatMessageProps) {
  const isOwn = message.user_id === currentUserId;
  const showActions = isOwn;
  const senderName =
    isHousehold && !isOwn ? (message.sender_name ?? null) : null;
  const showAvatar = isHousehold && !isOwn;
  const timestamp = message.created_at
    ? format(new Date(message.created_at), 'p')
    : null;

  const handleRetrySend = () => {
    onRetrySend?.(message);
  };
  const handleNeedsCategory = () => {
    if (!isOwn) return;
    onOpenExpenseDetails?.(message);
  };
  const handleExpenseDetails = () => {
    if (!isOwn) return;
    onOpenExpenseDetails?.(message);
  };
  const handleExpenseFailed = () => {
    if (!isOwn) return;
    onOpenExpenseDetails?.(message);
  };
  const handleDelete = () => {
    onDelete?.(message);
  };

  const status = getStatusDisplay(message, isOwn);

  return (
    <ChatMessageBubble
      message={message.content}
      isOwn={isOwn}
      senderName={senderName}
      showAvatar={showAvatar}
      timestamp={timestamp}
      status={status}
      showActions={showActions}
      deleteError={deleteError}
      onRetrySend={handleRetrySend}
      onNeedsCategory={handleNeedsCategory}
      onExpenseDetails={handleExpenseDetails}
      onExpenseFailed={handleExpenseFailed}
      onDelete={handleDelete}
    />
  );
}
