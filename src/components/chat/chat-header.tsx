'use client';

import { Flex } from '@ui/flex/flex';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { Typography } from '@ui/typography/typography';
import { MemberAvatar, type RowAuthor } from './chat-row';
import styles from './color-tickets.module.css';

export type ChatScope = 'personal' | 'household';

export type ScopeSwitch = {
  active: ChatScope;
  options: Array<{ value: ChatScope; label: string }>;
  onChange: (scope: ChatScope) => void;
};

type ChatHeaderProps = {
  title: string;
  /** Faces shown next to the title (everyone in this chat). */
  people: RowAuthor[];
  /** Absent when there is no household to switch to. */
  scopeSwitch?: ScopeSwitch;
};

export function ChatHeader({ title, people, scopeSwitch }: ChatHeaderProps) {
  return (
    <Flex
      as="header"
      alignItems="center"
      justifyContent="space-between"
      wrap="wrap"
      gap={2}
      className={styles.header}
    >
      <Flex alignItems="center" gap={1.5} className={styles['header__who']}>
        <span className={styles.faces}>
          {people.map((person, index) => (
            <MemberAvatar key={`${person.name}-${index}`} author={person} />
          ))}
        </span>
        <Typography
          as="h2"
          size="lg"
          weight="bold"
          className={styles['header__title']}
        >
          {title}
        </Typography>
      </Flex>
      {scopeSwitch ? (
        <ToggleGroup
          className={styles['header__scope']}
          items={scopeSwitch.options}
          value={[scopeSwitch.active]}
          onValueChange={value => {
            const next = value[0];
            if (next === 'personal' || next === 'household') {
              scopeSwitch.onChange(next);
            }
          }}
        />
      ) : null}
    </Flex>
  );
}
