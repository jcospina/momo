'use client';

import { CheckIcon } from '@ui/icons/check';
import { cn } from '@utils/cn';
import type { ChangeEvent, InputHTMLAttributes } from 'react';
import { useEffect, useId, useRef } from 'react';
import styles from './checkbox.module.css';

/** Possible states for a checkbox: checked, unchecked, or indeterminate. */
export type CheckboxCheckedState = boolean | 'indeterminate';

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Show the error/invalid visual treatment. */
  error?: boolean;
  /** Render the indeterminate (dash) indicator instead of a checkmark. @default false */
  indeterminate?: boolean;
  /** Size variant. @default 'md' */
  size?: 'sm' | 'md';
  /** Class applied to the outer `<label>` wrapper. */
  className?: string;
  /** Class applied directly to the native `<input>`. */
  inputClassName?: string;
  /** Fires with the next checked state whenever the user toggles the checkbox. */
  onCheckedChange?: (checked: CheckboxCheckedState) => void;
}

/**
 * Styled checkbox with support for the indeterminate state.
 *
 * Wraps a native `<input type="checkbox">` inside a `<label>` with a custom
 * check-mark icon. The `indeterminate` prop sets the native property via a
 * ref effect, and `onCheckedChange` reports the tri-state value.
 *
 * **Client component** — requires `'use client'`.
 *
 * @example Controlled usage
 * ```tsx
 * const [enabled, setEnabled] = useState(false);
 * <Checkbox checked={enabled} onCheckedChange={setEnabled} />
 * ```
 *
 * @example With external label + error text
 * ```tsx
 * const errorId = 'setting-error';
 * <>
 *   <label htmlFor="setting-toggle">Setting</label>
 *   <Checkbox
 *     id="setting-toggle"
 *     checked
 *     aria-describedby={errorId}
 *     error
 *   />
 *   <p id={errorId}>Something went wrong</p>
 * </>
 * ```
 */
export function Checkbox(props: CheckboxProps) {
  const generatedId = useId();
  const {
    error,
    indeterminate = false,
    size = 'md',
    className,
    inputClassName,
    onCheckedChange,
    id,
    style,
    ['aria-describedby']: ariaDescribedby,
    ['aria-invalid']: ariaInvalid,
    onChange,
    ...inputProps
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);

  const inputId = id ?? generatedId;

  const ariaDescribedbyValue =
    ariaDescribedby && ariaDescribedby.trim().length
      ? ariaDescribedby
      : undefined;
  const ariaInvalidValue = error ? true : (ariaInvalid ?? undefined);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    onCheckedChange?.(
      event.target.indeterminate ? 'indeterminate' : event.target.checked,
    );
  };

  return (
    <label
      className={cn(styles['momo-checkbox'], className)}
      style={style}
      data-size={size}
    >
      <input
        {...inputProps}
        ref={inputRef}
        id={inputId}
        type="checkbox"
        className={cn(styles['momo-checkbox__input'], inputClassName)}
        aria-describedby={ariaDescribedbyValue}
        aria-invalid={ariaInvalidValue}
        onChange={handleChange}
      />
      <span className={styles['momo-checkbox__box']} aria-hidden="true">
        <CheckIcon className={styles['momo-checkbox__icon']} />
      </span>
    </label>
  );
}
