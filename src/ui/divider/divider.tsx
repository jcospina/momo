import type { CSSProperties } from 'react';

import styles from './divider.module.css';

function getDividerThickness(thickness: Thickness): number {
  switch (thickness) {
    case 'thin':
      return 1;
    case 'thick':
      return 3;
    case 'regular':
    default:
      return 2;
  }
}

type Thickness = 'thin' | 'regular' | 'thick';
interface DividerProps {
  /**
   * Line thickness variant.
   * - `'thin'` — 1 px
   * - `'regular'` — 2 px (default)
   * - `'thick'` — 3 px
   */
  thickness?: Thickness;
}

/**
 * Horizontal rule that visually separates content sections.
 *
 * Renders a styled `<div>` whose height is driven by a CSS custom property
 * (`--thickness`), so the actual pixel value stays in CSS land.
 *
 * @example
 * ```tsx
 * <Panel>
 *   <Typography>Section A</Typography>
 *   <Divider />
 *   <Typography>Section B</Typography>
 * </Panel>
 *
 * <Divider thickness="thin" />
 * ```
 */
export function Divider({ thickness = 'regular' }: DividerProps) {
  const thicknessStyle = {
    '--thickness': getDividerThickness(thickness),
  } as CSSProperties;
  return <div style={thicknessStyle} className={styles['momo-divider']} />;
}
