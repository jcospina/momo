'use client';

import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '@utils/cn';
import styles from './toggle-group.module.css';
import type { ToggleGroupProps } from './toggle-group.types';

/**
 * Group of toggle buttons backed by Base UI's `ToggleGroup`.
 *
 * Supports both single-select and multi-select modes, controlled and
 * uncontrolled usage. Each toggle is rendered from the `items` array.
 *
 * **Client component** — requires `'use client'`.
 *
 * @example Single-select time window (controlled)
 * ```tsx
 * const [range, setRange] = useState(['3m']);
 *
 * <ToggleGroup
 *   items={[
 *     { label: '1m', value: '1m' },
 *     { label: '3m', value: '3m' },
 *     { label: '6m', value: '6m' },
 *     { label: '12m', value: '12m' },
 *   ]}
 *   value={range}
 *   onValueChange={setRange}
 * />
 * ```
 *
 * @example Multi-select filter chips
 * ```tsx
 * <ToggleGroup
 *   multiple
 *   items={[
 *     { label: 'Food', value: 'food' },
 *     { label: 'Transport', value: 'transport' },
 *     { label: 'Rent', value: 'rent' },
 *   ]}
 *   defaultValue={['food']}
 *   onValueChange={setFilters}
 * />
 * ```
 */
export function ToggleGroup({
  className,
  items,
  defaultValue,
  value,
  onValueChange,
  multiple = false,
  disabled = false,
}: ToggleGroupProps) {
  return (
    <BaseToggleGroup
      className={cn(styles['momo-toggle-group'], className)}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      multiple={multiple}
      disabled={disabled}
    >
      {items.map(item => (
        <Toggle
          key={item.value}
          value={item.value}
          aria-label={item.label}
          className={styles['momo-toggle']}
          disabled={disabled || item.disabled}
          onClick={item.onClick}
        >
          {item.label}
        </Toggle>
      ))}
    </BaseToggleGroup>
  );
}
