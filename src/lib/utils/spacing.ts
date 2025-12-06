import type { MarginProps, PaddingProps } from '@lib-types/common';
import type { CSSProperties } from 'react';

type SpacingProperty =
  | 'padding'
  | 'paddingTop'
  | 'paddingLeft'
  | 'paddingBottom'
  | 'paddingRight'
  | 'margin'
  | 'marginTop'
  | 'marginLeft'
  | 'marginBottom'
  | 'marginRight';

function applySpacing(
  value: number | 'auto' | undefined,
  properties: SpacingProperty[],
  spacingStyles: CSSProperties,
) {
  if (value === undefined) {
    return null;
  }
  const cssValue = value === 'auto' ? value : `calc(var(--spacing) * ${value})`;
  properties.forEach(property => {
    spacingStyles[property] = cssValue;
  });
}

export function getSpacingStyles(
  props: PaddingProps & MarginProps,
): CSSProperties {
  const spacingStyles: CSSProperties = {};
  applySpacing(props.padding, ['padding'], spacingStyles);
  applySpacing(props.paddingX, ['paddingLeft', 'paddingRight'], spacingStyles);
  applySpacing(props.paddingY, ['paddingTop', 'paddingBottom'], spacingStyles);
  applySpacing(props.paddingTop, ['paddingTop'], spacingStyles);
  applySpacing(props.paddingBottom, ['paddingBottom'], spacingStyles);
  applySpacing(props.paddingLeft, ['paddingLeft'], spacingStyles);
  applySpacing(props.paddingRight, ['paddingRight'], spacingStyles);

  applySpacing(props.margin, ['margin'], spacingStyles);
  applySpacing(props.marginX, ['marginLeft', 'marginRight'], spacingStyles);
  applySpacing(props.marginY, ['marginTop', 'marginBottom'], spacingStyles);
  applySpacing(props.marginTop, ['marginTop'], spacingStyles);
  applySpacing(props.marginBottom, ['marginBottom'], spacingStyles);
  applySpacing(props.marginLeft, ['marginLeft'], spacingStyles);
  applySpacing(props.marginRight, ['marginRight'], spacingStyles);
  return spacingStyles;
}
