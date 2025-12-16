import { Avatar } from '@ui/avatar/avatar';
import { Flex } from '@ui/flex/flex';
import { Margin } from '@ui/margin/margin';
import { Padding } from '@ui/padding/padding';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import { firstName } from '@utils/user';
import styles from './chat.module.css';

interface ChatMessageProps {
  message: string;
  isOwn?: boolean;
  senderName?: string | null;
  showAvatar?: boolean;
  timestamp?: string;
}
export function ChatMessage({
  message,
  isOwn = false,
  senderName = null,
  showAvatar = false,
  timestamp,
}: ChatMessageProps) {
  const name = firstName(senderName, null);

  return (
    <Flex gap={1} marginLeft={isOwn ? 'auto' : 0}>
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
          <Typography as="p" size="md">
            {message}
          </Typography>
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
