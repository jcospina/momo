import { FlexProps } from '@components/flex/flex.types';
import type { PropsWithClassName } from '@lib-types/common';
import { cn } from '@utils/cn';
import { getSpacingStyles } from '@utils/spacing';

import { getGapStyles } from '@utils/gap';
import type { CSSProperties, ElementType } from 'react';
import styles from './flex.module.css';

export function Flex<T extends ElementType>({
  as,
  className,
  direction = 'row',
  gap,
  gapX,
  gapY,
  justifyContent = 'flex-start',
  alignItems = 'flex-start',
  wrap = 'nowrap',
  isInline = false,
  isFullHeight,
  isFullWidth,
  children,
  style,
  padding,
  paddingX,
  paddingY,
  paddingLeft,
  paddingRight,
  paddingTop,
  paddingBottom,
  margin,
  marginX,
  marginY,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  ...props
}: PropsWithClassName<FlexProps<T>>) {
  const Component = as || 'div';

  const spacingStyles: CSSProperties = getSpacingStyles({
    padding,
    paddingX,
    paddingY,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    margin,
    marginX,
    marginY,
    marginLeft,
    marginRight,
    marginTop,
    marginBottom,
  });

  const gapStyles = getGapStyles(gap, gapX, gapY);

  const flexStyles = {
    flexDirection: direction,
    justifyContent,
    alignItems,
    flexWrap: wrap,
  } as CSSProperties;
  const inlineStyle = style as CSSProperties | undefined;
  const mergedStyle: CSSProperties = {
    ...gapStyles,
    ...flexStyles,
    ...spacingStyles,
    ...(inlineStyle || {}),
  };
  return (
    <Component
      style={mergedStyle}
      className={cn(
        styles['momo-flex'],
        isInline && styles['momo-flex--inline'],
        isFullHeight && styles['momo-flex--full-h'],
        isFullWidth && styles['momo-flex--full-w'],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
