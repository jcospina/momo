import { getSpacingStyles } from '@utils/spacing';
import type { CSSProperties, ElementType } from 'react';
import type { FlexItemProps } from '@/ui/flex-item/flex-item.types';

/**
 * Child of a {@link Flex} container with explicit flex-item properties.
 *
 * Applies `flex-grow`, `flex-shrink`, `flex-basis`, `order`, and
 * `align-self` as inline styles together with optional spacing props.
 *
 * @typeParam T - Polymorphic HTML element. @default 'div'
 *
 * @example Grow to fill remaining space
 * ```tsx
 * <Flex gap={2}>
 *   <Avatar displayName="A" size="small" />
 *   <FlexItem grow={1}>
 *     <Typography>Expandable content</Typography>
 *   </FlexItem>
 * </Flex>
 * ```
 *
 * @example Fixed-width sidebar with custom alignment
 * ```tsx
 * <FlexItem basis="240px" shrink={0} align="stretch">
 *   <Nav />
 * </FlexItem>
 * ```
 */
export function FlexItem<T extends ElementType>({
  className,
  children,
  as,
  order,
  grow,
  shrink,
  basis,
  align,
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
    alignSelf: align,
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
