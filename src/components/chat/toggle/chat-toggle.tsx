import { Flex } from '@ui/flex/flex';
import { GroupIcon } from '@ui/icons/group';
import { PersonIcon } from '@ui/icons/person';
import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import styles from './chat-toggle.module.css';

export type ChatTab = 'personal' | 'household';

type ChatToggleProps = {
  active: ChatTab;
  onChange: (next: ChatTab) => void;
  householdName?: string;
};

export function ChatToggle({
  active,
  onChange,
  householdName,
}: ChatToggleProps) {
  const isPersonal = active === 'personal';

  return (
    <Flex
      className={styles['momo-chat-toggle']}
      alignItems="stretch"
      isFullWidth
    >
      <button
        type="button"
        className={cn(
          styles['momo-chat-toggle__item'],
          styles['momo-chat-toggle__item--personal'],
          isPersonal ? styles['momo-chat-toggle__item--active'] : '',
        )}
        onClick={() => onChange('personal')}
        aria-pressed={isPersonal}
      >
        <PersonIcon />
        {isPersonal ? (
          <Typography as="span" size="lg">
            Personal
          </Typography>
        ) : null}
      </button>
      <button
        type="button"
        className={cn(
          styles['momo-chat-toggle__item'],
          styles['momo-chat-toggle__item--household'],
          !isPersonal ? styles['momo-chat-toggle__item--active'] : '',
        )}
        onClick={() => onChange('household')}
        aria-pressed={!isPersonal}
      >
        <GroupIcon />
        {!isPersonal ? (
          <Typography as="span" size="lg">
            {householdName || 'Household'}
          </Typography>
        ) : null}
      </button>
    </Flex>
  );
}
