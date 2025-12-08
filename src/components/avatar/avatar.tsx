import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';
import type { CSSProperties } from 'react';

import {
  getAvatarBorderWidth,
  getAvatarFontSize,
  getAvatarShadow,
  getAvatarSizeMultiplier,
  getInitial,
} from '@components/avatar/avatar.utils';
import styles from './avatar.module.css';
import { AvatarProps } from './avatar.types';

export function Avatar(props: PropsWithClassName<AvatarProps>) {
  const {
    size = 'medium',
    displayName,
    className,
    variant,
    color = 'sky-aqua',
  } = props;
  const avatarStyles = {
    '--avatar-size': getAvatarSizeMultiplier(size),
    '--avatar-shadow': getAvatarShadow(size),
    '--avatar-font-size': getAvatarFontSize(size),
    '--avatar-border-width': getAvatarBorderWidth(size),
    backgroundColor: `var(--color-${color})`,
  } as CSSProperties;
  return (
    <div
      style={avatarStyles}
      className={cn(
        styles['momo-avatar'],
        variant === 'button' && styles['momo-avatar--button'],
        className,
      )}
      onClick={variant === 'button' ? props.onClick : undefined}
    >
      {getInitial(displayName)}
    </div>
  );
}
