import { Typography } from '@ui/typography/typography';
import { cn } from '@utils/cn';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import styles from './chip.module.css';

type ChipProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  /** Short label shown on the chip. */
  children: ReactNode;
  /**
   * Colour of the leading dot, as any CSS colour (for example
   * `var(--category-dining)`). The chip also warms to it on hover.
   * Omit it for a plain text chip.
   */
  dot?: string;
};

function dotStyle(dot: string | undefined, style: CSSProperties | undefined) {
  if (!dot) return style;
  return { '--chip-dot': dot, ...style } as CSSProperties;
}

/**
 * Small pill-shaped quick choice, optionally led by a colour dot.
 *
 * Use it for one-tap picks such as suggested categories. For a set of
 * options where one stays selected, use `ToggleGroup` instead.
 *
 * All extra props are forwarded to the underlying `<button>`, so the click
 * event (and its `currentTarget`) reaches `onClick` as usual.
 *
 * @example Category quick pick
 * ```tsx
 * <Chip dot="var(--category-groceries)" onClick={() => pick('groceries')}>
 *   Groceries
 * </Chip>
 * ```
 *
 * @example Plain chip
 * ```tsx
 * <Chip onClick={showAll}>All</Chip>
 * ```
 */
export function Chip({
  children,
  dot,
  className,
  style,
  type = 'button',
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      className={cn(
        styles['momo-chip'],
        dot && styles['momo-chip--dot'],
        className,
      )}
      style={dotStyle(dot, style)}
      {...rest}
    >
      {dot ? <span className={styles['momo-chip__dot']} aria-hidden /> : null}
      <Typography as="span" size="sm" weight="bold">
        {children}
      </Typography>
    </button>
  );
}
