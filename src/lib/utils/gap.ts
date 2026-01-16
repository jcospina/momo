import type { CSSProperties } from 'react';

type GapProperty = 'gap' | 'rowGap' | 'columnGap';

function applyGap(
  value: number | undefined,
  properties: GapProperty[],
  gapStyles: CSSProperties,
) {
  if (value === undefined) {
    return null;
  }
  const cssValue = `calc(var(--spacing) * ${value})`;
  properties.forEach(property => {
    gapStyles[property] = cssValue;
  });
}

export function getGapStyles(
  gap: number | undefined,
  gapX: number | undefined,
  gapY: number | undefined,
): CSSProperties {
  const gapStyles: CSSProperties = {};
  applyGap(gap, ['gap'], gapStyles);
  applyGap(gapX, ['rowGap'], gapStyles);
  applyGap(gapY, ['columnGap'], gapStyles);
  return gapStyles;
}
