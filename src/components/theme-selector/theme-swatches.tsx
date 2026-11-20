import type { ThemeDefinition } from '@/lib/theme/themes';
import styles from './theme-selector.module.css';

type ThemeSwatchesProps = {
  swatches: ThemeDefinition['swatches'];
};

export function ThemeSwatches({ swatches }: ThemeSwatchesProps) {
  return (
    <span
      className={styles['momo-theme-selector__swatches']}
      aria-hidden="true"
    >
      {swatches.map((color, i) => (
        <span
          key={`${color}-${i}`}
          className={styles['momo-theme-selector__swatch']}
          style={{ background: color }}
        />
      ))}
    </span>
  );
}
