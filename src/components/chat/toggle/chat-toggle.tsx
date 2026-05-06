import { useProfile } from '@providers/profile-provider';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { useTranslations } from 'next-intl';
import styles from './chat-toggle.module.css';

export type ChatTab = 'personal' | 'household';

type ChatToggleProps = {
  active: ChatTab;
  onChange: (next: ChatTab) => void;
  householdName?: string;
  showHousehold?: boolean;
};

export function ChatToggle({
  active,
  onChange,
  householdName,
  showHousehold = true,
}: ChatToggleProps) {
  const t = useTranslations('chat.tabs');
  const profile = useProfile();
  const items = [
    {
      label: profile?.display_name?.trim() || t('personal'),
      value: 'personal',
    },
    ...(showHousehold
      ? [
          {
            label: householdName?.trim() || t('household'),
            value: 'household',
          },
        ]
      : []),
  ];

  return (
    <div className={styles['momo-chat-toggle']}>
      <ToggleGroup
        className={styles['momo-chat-toggle__tabs']}
        items={items}
        value={[active]}
        onValueChange={value => {
          const next = value[0];
          if (!next) return;
          onChange(next as ChatTab);
        }}
      />
    </div>
  );
}
