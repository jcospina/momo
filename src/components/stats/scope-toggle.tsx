'use client';

import { Flex } from '@ui/flex/flex';
import { ToggleGroup } from '@ui/toggle-group/toggle-group';
import { useTranslations } from 'next-intl';

export type StatsScope = 'personal' | 'household';

type ScopeToggleProps = {
  /** The selected scope, or null for the skeleton's unselected stand-in. */
  value: StatsScope | null;
  onChange?: (scope: StatsScope) => void;
};

/**
 * The Personal / Household switch above the stats panels. The stats
 * skeleton draws it too, so the panels sit at the same height before and
 * after the data arrives.
 */
export function ScopeToggle({ value, onChange }: ScopeToggleProps) {
  const t = useTranslations('chat.tabs');

  const scopeOptions = [
    { label: t('personal'), value: 'personal' },
    { label: t('household'), value: 'household' },
  ];

  function handleValueChange(selected: string[]) {
    const next = selected[0];
    if (!next) return;
    onChange?.(next as StatsScope);
  }

  return (
    <Flex
      alignItems="center"
      justifyContent="center"
      paddingBottom={1}
      isFullWidth
    >
      <ToggleGroup
        items={scopeOptions}
        value={value ? [value] : []}
        onValueChange={handleValueChange}
      />
    </Flex>
  );
}
