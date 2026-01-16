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
  thickness?: Thickness;
}
export function Divider({ thickness = 'regular' }: DividerProps) {
  const thicknessStyle = {
    '--thickness': getDividerThickness(thickness),
  } as CSSProperties;
  return <div style={thicknessStyle} className={styles['momo-divider']} />;
}
