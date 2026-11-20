'use client';

import { ThemeSwatches } from '@components/theme-selector/theme-swatches';
import { useTheme } from '@providers/theme-provider';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { ThemeDefinition } from '@/lib/theme/themes';
import { Flex } from '@/ui/flex/flex';
import { Select } from '@/ui/select/select';
import { Typography } from '@/ui/typography/typography';

import styles from './profile.module.css';

function ThemeOptionLabel({ option }: { option: ThemeDefinition }) {
  return (
    <Flex alignItems="center" gap={1}>
      <ThemeSwatches swatches={option.swatches} />
      <Typography as="span" size="sm" weight="bold">
        {option.label}
      </Typography>
    </Flex>
  );
}

function ThemeValue({ option }: { option: ThemeDefinition }) {
  return (
    <Flex as="span" alignItems="center" gap={1}>
      <ThemeSwatches swatches={option.swatches} />
      {option.label}
    </Flex>
  );
}

export function ThemeSelect() {
  const t = useTranslations('profile.theme');
  const { theme, setTheme, themes } = useTheme();
  const selected = themes.find(option => option.name === theme) ?? null;

  const handleChange = useCallback(
    (option: ThemeDefinition | null) => {
      if (!option) return;
      setTheme(option.name);
    },
    [setTheme],
  );

  return (
    <div className={styles['profile__settings-row']}>
      <Typography as="label" size="md" weight="bold">
        {t('label')}
      </Typography>
      <Select
        className={styles['profile__currency-select']}
        name="theme"
        aria-label={t('ariaLabel')}
        options={themes}
        value={selected}
        placeholder={t('placeholder')}
        getOptionLabel={option => option.label}
        getOptionValue={option => option.name}
        onChange={handleChange}
        renderValue={option =>
          option ? <ThemeValue option={option} /> : t('placeholder')
        }
        renderOption={option => <ThemeOptionLabel option={option} />}
      />
    </div>
  );
}
