import { cn } from '@utils/cn';
import type { ElementType } from 'react';
import styles from './sticker.module.css';
import type { StickerProps } from './sticker.types';

/**
 * Bordered paper label for navigation and short choices. Hovering peels it
 * up into a tilt; the active one is filled sky and placed with a slight
 * tilt, landing on a spring.
 *
 * Renders a `button` by default; pass `as` for links.
 *
 * @example
 * ```tsx
 * <Sticker as="a" href="/home/stats" active aria-current="page">Stats</Sticker>
 * <Sticker as={Link} href="/signup" variant="primary">Sign up</Sticker>
 * ```
 */
export function Sticker<T extends ElementType = 'button'>({
  as,
  active = false,
  variant = 'paper',
  shape = 'tag',
  className,
  children,
  ...props
}: StickerProps<T>) {
  const Component = (as || 'button') as ElementType;
  const buttonDefaults = Component === 'button' ? { type: 'button' } : {};

  return (
    <Component
      {...buttonDefaults}
      data-active={active ? '' : undefined}
      className={cn(
        styles['momo-sticker'],
        styles[`momo-sticker--${variant}`],
        styles[`momo-sticker--${shape}`],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
