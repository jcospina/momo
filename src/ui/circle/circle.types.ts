import type { MomoColor } from '@lib-types/common';
import type { CSSProperties, PropsWithChildren } from 'react';

export type CircleSize = 'extra-small' | 'small' | 'medium' | 'large';

export type CircleProps = PropsWithChildren<{
  size?: CircleSize;
  color?: MomoColor;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}>;
