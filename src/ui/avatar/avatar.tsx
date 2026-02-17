import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';

import { getInitial } from '@/ui/avatar/avatar.utils';
import { Circle } from '@/ui/circle/circle';
import styles from './avatar.module.css';
import { AvatarProps } from './avatar.types';

/**
 * Circular user avatar that displays the first letter of the user's name.
 *
 * Built on top of {@link Circle}, it extracts the initial via
 * {@link getInitial} and renders it inside a coloured circle. Falls back to
 * `?` when `displayName` is `null` or empty.
 *
 * @example
 * ```tsx
 * <Avatar displayName="Alice" />
 * <Avatar displayName="Bob" size="large" color="vibrant-coral" />
 * <Avatar displayName={null} />          // renders "?"
 * <Avatar displayName="Carol" onClick={() => openProfile()} />
 * ```
 */
export function Avatar(props: PropsWithClassName<AvatarProps>) {
  const {
    size = 'medium',
    displayName,
    className,
    onClick,
    color = 'sky-aqua',
  } = props;
  return (
    <Circle
      size={size}
      color={color}
      className={cn(styles['momo-avatar'], className)}
      onClick={onClick}
    >
      {getInitial(displayName)}
    </Circle>
  );
}
