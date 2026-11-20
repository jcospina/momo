'use client';

import { useTheme } from '@providers/theme-provider';
import { Menu } from '@ui/menu/menu';
import { cn } from '@utils/cn';
import { useTranslations } from 'next-intl';
import styles from './theme-selector.module.css';
import { ThemeSwatches } from './theme-swatches';

export function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();
  const t = useTranslations('theme');
  const active = themes.find(item => item.name === theme) ?? themes[0];

  const items = themes.map(item => ({
    type: 'item' as const,
    label: (
      <span
        className={cn(
          styles['momo-theme-selector__item'],
          item.name === theme && styles['momo-theme-selector__active'],
        )}
      >
        <ThemeSwatches swatches={item.swatches} />
        {item.label}
      </span>
    ),
    onSelect: () => setTheme(item.name),
  }));

  return (
    <Menu items={items} side="bottom" align="end">
      <button
        type="button"
        className={styles['momo-theme-selector__trigger']}
        aria-label={t('select_label')}
      >
        <ThemeSwatches swatches={active.swatches} />
        <span className={styles['momo-theme-selector__label']}>
          {active.label}
        </span>
      </button>
    </Menu>
  );
}
