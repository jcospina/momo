'use client';

import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { cn } from '@utils/cn';
import styles from './toggle-group.module.css';
import type { ToggleGroupProps } from './toggle-group.types';

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
