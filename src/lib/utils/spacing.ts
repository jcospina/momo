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

export function getPaddingStyles(props: PaddingProps) {
  const paddingStyles: CSSProperties = {};
  applySpacing(props.padding, ['padding'], paddingStyles);
  applySpacing(props.paddingX, ['paddingLeft', 'paddingRight'], paddingStyles);
  applySpacing(props.paddingY, ['paddingTop', 'paddingBottom'], paddingStyles);
  applySpacing(props.paddingTop, ['paddingTop'], paddingStyles);
  applySpacing(props.paddingBottom, ['paddingBottom'], paddingStyles);
  applySpacing(props.paddingLeft, ['paddingLeft'], paddingStyles);
  applySpacing(props.paddingRight, ['paddingRight'], paddingStyles);
  return paddingStyles;
}

export function getMarginStyles(props: MarginProps) {
  const marginStyles: CSSProperties = {};
  applySpacing(props.margin, ['margin'], marginStyles);
  applySpacing(props.marginX, ['marginLeft', 'marginRight'], marginStyles);
  applySpacing(props.marginY, ['marginTop', 'marginBottom'], marginStyles);
  applySpacing(props.marginTop, ['marginTop'], marginStyles);
  applySpacing(props.marginBottom, ['marginBottom'], marginStyles);
  applySpacing(props.marginLeft, ['marginLeft'], marginStyles);
  applySpacing(props.marginRight, ['marginRight'], marginStyles);
  return marginStyles;
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
