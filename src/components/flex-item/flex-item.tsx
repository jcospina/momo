import type { FlexItemProps } from '@components/flex-item/flex-item.types';
import { getSpacingStyles } from '@utils/spacing';
import type { CSSProperties, ElementType } from 'react';

export function FlexItem<T extends ElementType>({
  className,
  children,
  as,
  order,
  grow,
  shrink,
  basis,
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
}: FlexItemProps<T>) {
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
  const flexItemStyles = {
    flexGrow: grow || 0,
    flexShrink: shrink || 1,
    flexBasis: basis || 'auto',
    order: order || 0,
  } as CSSProperties;
  const inlineStyle = style as CSSProperties | undefined;
  const mergedStyle: CSSProperties = {
    ...spacingStyles,
    ...flexItemStyles,
    ...(inlineStyle || {}),
  };
  return (
    <Component style={mergedStyle} {...props} className={className}>
      {children}
    </Component>
  );
}
