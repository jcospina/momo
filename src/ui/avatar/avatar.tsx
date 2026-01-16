import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';

import { getInitial } from '@/ui/avatar/avatar.utils';
import { Circle } from '@/ui/circle/circle';
import styles from './avatar.module.css';
import { AvatarProps } from './avatar.types';

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
