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
import styles from './chat-message.module.css';

type StatusTone = 'error' | 'warning' | 'expense';

type StatusKind =
  | 'retry_send'
  | 'needs_category'
  | 'expense_created'
  | 'expense_failed';

type StatusDisplay = {
  kind: StatusKind;
  label: string;
  tone: StatusTone;
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
        label:
          message.expense_count > 1 ? 'expenses created' : 'expense created',
        tone: 'expense',
      };
    }
    return null;
  }

  if (isLocalError) {
    return {
      kind: 'retry_send',
      label: 'send failed',
      tone: 'error',
    };
  }

  if (isFailed) {
    return {
      kind: 'expense_failed',
      label: 'expense failed',
      tone: 'error',
    };
  }

  if (needsCategory) {
    return {
      kind: 'needs_category',
      label: 'needs category',
      tone: 'warning',
    };
  }

  if (hasExpenses) {
    return {
      kind: 'expense_created',
      label: message.expense_count > 1 ? 'expenses created' : 'expense created',
      tone: 'expense',
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
    <Menu items={[{ type: 'item', label: 'Retry', onSelect: onClick }]}>
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
};

function ActionsTriggerButton({ onDelete, onEdit }: ActionsTriggerButtonProps) {
  return (
    <Menu
      items={[
        { type: 'item', label: 'Edit', onSelect: onEdit },
        { type: 'item', label: 'Delete', tone: 'danger', onSelect: onDelete },
      ]}
    >
      <Button
        type="button"
        variant="icon"
        className={cn(
          styles['momo-chat__icon-button'],
          styles['momo-chat__actions-trigger'],
        )}
        aria-label="Message actions"
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
  const name = firstName(senderName, null);
  const baseStatusClass = cn(
    styles['momo-chat__icon-button'],
    styles['momo-chat__status-icon'],
  );
  const deleteDialog = useDialogController();

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
                  label={status.label}
                  className={statusClassName}
                  onClick={onRetrySend}
                />
              ) : null}
              {status?.kind === 'needs_category' ? (
                <NeedsCategoryButton
                  label={status.label}
                  className={statusClassName}
                  onClick={onNeedsCategory}
                />
              ) : null}
              {status?.kind === 'expense_failed' ? (
                <ExpenseFailedButton
                  label={status.label}
                  className={statusClassName}
                  onClick={onExpenseFailed}
                />
              ) : null}
              {status?.kind === 'expense_created' ? (
                <ExpenseCreatedButton
                  label={status.label}
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
              Damn, I cannot delete that
            </Typography>
          ) : null}
        </Flex>
      </Flex>
      <Dialog
        controller={deleteDialog}
        title="Delete message?"
        content="This will remove the message permanently."
        actions={
          <>
            <Button variant="secondary" onClick={deleteDialog.closeDialog}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmDelete}>
              Confirm
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
