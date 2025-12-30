import { format } from 'date-fns';

import type { ChatMessage as ChatMessageRecord } from '@lib-types/chat';
import { Avatar } from '@ui/avatar/avatar';
import { Flex } from '@ui/flex/flex';
import { AlertIcon } from '@ui/icons/alert';
import { CentsIcon } from '@ui/icons/cents';
import { ThreeDotsIcon } from '@ui/icons/three-dots';
import { Margin } from '@ui/margin/margin';
import { Padding } from '@ui/padding/padding';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { firstName } from '@utils/user';
import styles from './chat-message.module.css';

type StatusTone = 'error' | 'warning' | 'expense';

type StatusIndicator = {
  label: string;
  tone: StatusTone;
  icon: 'alert' | 'cents';
};

type ChatMessageProps = {
  message: ChatMessageRecord;
  currentUserId: string;
  isHousehold: boolean;
};

type ChatMessageBubbleProps = {
  message: string;
  isOwn: boolean;
  senderName: string | null;
  showAvatar: boolean;
  timestamp: string | null;
  status: StatusIndicator | null;
  showActions: boolean;
};

function getStatusIndicator(
  message: ChatMessageRecord,
  isOwn: boolean,
): StatusIndicator | null {
  const isLocalOnly = message.id.startsWith('tmp-');
  const isLocalError = isLocalOnly && message.status === 'failed';
  const isFailed = message.status === 'failed';
  const hasExpenses = message.expense_count > 0;
  const needsCategory = message.status === 'needs_category';

  if (!isOwn) {
    if (hasExpenses) {
      return {
        label:
          message.expense_count > 1 ? 'expenses created' : 'expense created',
        tone: 'expense',
        icon: 'cents',
      };
    }
    return null;
  }

  if (isLocalError) {
    return {
      label: 'send failed',
      tone: 'error',
      icon: 'alert',
    };
  }

  if (isFailed) {
    return {
      label: 'expense failed',
      tone: 'error',
      icon: 'alert',
    };
  }

  if (needsCategory) {
    return {
      label: 'needs category',
      tone: 'warning',
      icon: 'alert',
    };
  }

  if (hasExpenses) {
    return {
      label: message.expense_count > 1 ? 'expenses created' : 'expense created',
      tone: 'expense',
      icon: 'cents',
    };
  }

  return null;
}

function ChatMessageBubble({
  message,
  isOwn,
  senderName,
  showAvatar,
  timestamp,
  status,
  showActions,
}: ChatMessageBubbleProps) {
  const name = firstName(senderName, null);
  const statusClassName = cn(
    styles['momo-chat__status-icon'],
    status?.tone && styles[`momo-chat__status-icon--${status.tone}`],
  );

  return (
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
            {status ? (
              <span className={statusClassName} title={status.label}>
                {status.icon === 'alert' ? (
                  <AlertIcon width={18} height={18} />
                ) : (
                  <CentsIcon width={18} height={18} />
                )}
              </span>
            ) : null}
            <Typography
              as="p"
              size="md"
              className={styles['momo-chat__content']}
            >
              {message}
            </Typography>
            {showActions ? (
              <span
                className={styles['momo-chat__actions-trigger']}
                aria-hidden="true"
              >
                <ThreeDotsIcon width={16} height={16} />
              </span>
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
      </Flex>
    </Flex>
  );
}

export function ChatMessage({
  message,
  currentUserId,
  isHousehold,
}: ChatMessageProps) {
  const isOwn = message.user_id === currentUserId;
  const showActions = isOwn;
  const senderName =
    isHousehold && !isOwn ? (message.sender_name ?? null) : null;
  const showAvatar = isHousehold && !isOwn;
  const timestamp = message.created_at
    ? format(new Date(message.created_at), 'p')
    : null;
  const status = getStatusIndicator(message, isOwn);

  return (
    <ChatMessageBubble
      message={message.content}
      isOwn={isOwn}
      senderName={senderName}
      showAvatar={showAvatar}
      timestamp={timestamp}
      status={status}
      showActions={showActions}
    />
  );
}
