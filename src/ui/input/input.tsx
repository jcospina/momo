'use client';

import { cn } from '@utils/cn';
import type {
  InputHTMLAttributes,
  ReactNode,
  RefObject,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef, useCallback, useEffect, useRef } from 'react';
import styles from './input.module.css';

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'prefix' | 'suffix'
> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix' | 'suffix'> & {
    /**
     * Optional element rendered on the left side of the input (e.g., emoji button).
     */
    prefix?: ReactNode;
    /**
     * Optional element rendered on the right side of the input (e.g., upload icon).
     */
    suffix?: ReactNode;
    /**
     * Additional className applied directly to the native input element.
     */
    inputClassName?: string;
    /**
     * Render a multiline textarea instead of a single-line input.
     */
    multiline?: boolean;
    /**
     * Input type (applies only to single-line variant).
     */
    type?: InputHTMLAttributes<HTMLInputElement>['type'];
    /**
     * Auto-resize the textarea height to fit content up to `maxRows`.
     */
    autoResize?: boolean;
    /**
     * Minimum rows for the textarea when multiline.
     */
    minRows?: number;
    /**
     * Maximum rows for the textarea when multiline.
     */
    maxRows?: number;
  };

/**
 * Styled text input / textarea with optional left/right adornments.
 *
 * Renders a `<div>` wrapper containing optional prefix/suffix adornment
 * slots and either a native `<input>` or `<textarea>`. When `multiline` is
 * enabled with `autoResize`, the textarea dynamically grows from `minRows`
 * to `maxRows` as the user types.
 *
 * Forwards a ref to the underlying native element.
 *
 * **Client component** — requires `'use client'`.
 *
 * @example Single-line input with adornments
 * ```tsx
 * <Input
 *   prefix={<EmojiButton />}
 *   suffix={<UploadIcon />}
 *   placeholder="Add a note…"
 * />
 * ```
 *
 * @example Auto-resizing multiline textarea
 * ```tsx
 * <Input
 *   multiline
 *   minRows={2}
 *   maxRows={8}
 *   placeholder="Describe the expense…"
 * />
 * ```
 *
 * @example Disabled state
 * ```tsx
 * <Input value="Read only" disabled />
 * ```
 */
export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(
  (
    {
      className,
      inputClassName,
      prefix,
      suffix,
      disabled,
      multiline = false,
      autoResize = true,
      minRows = 1,
      maxRows = 6,
      ...props
    },
    ref,
  ) => {
    const wrapperClass = cn(
      styles['momo-input-wrapper'],
      {
        [styles['momo-input-wrapper--disabled']]: disabled,
      },
      className,
    );

    const inputClass = cn(
      styles['momo-input'],
      {
        [styles['momo-input--multiline']]: multiline,
      },
      inputClassName,
    );

    const innerRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
      null,
    );

    const setRefs = useCallback(
      (node: HTMLInputElement | HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (!ref) return;
        if (typeof ref === 'function') {
          ref(node as HTMLInputElement);
        } else {
          (
            ref as RefObject<HTMLInputElement | HTMLTextAreaElement | null>
          ).current = node;
        }
      },
      [ref],
    );

    const resize = useCallback(() => {
      if (!multiline || !autoResize) return;
      const el = innerRef.current as HTMLTextAreaElement | null;
      if (!el) return;
      el.style.height = 'auto';

      const computed = window.getComputedStyle(el);
      const lineHeightRaw = parseFloat(computed.lineHeight || '0');
      const lineHeight =
        Number.isFinite(lineHeightRaw) && lineHeightRaw > 0
          ? lineHeightRaw
          : 20;
      const padding =
        parseFloat(computed.paddingTop || '0') +
        parseFloat(computed.paddingBottom || '0');
      const border =
        parseFloat(computed.borderTopWidth || '0') +
        parseFloat(computed.borderBottomWidth || '0');

      const minContent = lineHeight * (minRows || 1);
      const maxContent = lineHeight * (maxRows || minRows || 1);
      const minHeight = minContent + padding + border;
      const maxHeight = maxContent + padding + border;

      const desired = Math.max(minHeight, el.scrollHeight);
      const next = Math.min(maxHeight, desired);
      el.style.height = `${next}px`;
    }, [multiline, autoResize, minRows, maxRows]);

    useEffect(() => {
      resize();
    }, [resize, props.value, props.defaultValue]);

    const { rows, cols, wrap, onInput, type, ...restProps } =
      props as TextareaHTMLAttributes<HTMLTextAreaElement> &
        InputHTMLAttributes<HTMLInputElement>;

    const inputElement = multiline ? (
      <textarea
        ref={setRefs}
        className={inputClass}
        disabled={disabled}
        rows={rows ?? minRows}
        cols={cols}
        wrap={wrap}
        onInput={event => {
          resize();
          onInput?.(event);
        }}
        {...(restProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
      />
    ) : (
      <input
        ref={setRefs}
        className={inputClass}
        disabled={disabled}
        type={(type as InputHTMLAttributes<HTMLInputElement>['type']) ?? 'text'}
        {...(restProps as InputHTMLAttributes<HTMLInputElement>)}
      />
    );

    return (
      <div className={wrapperClass} data-disabled={disabled ? 'true' : 'false'}>
        {prefix ? (
          <span className={styles['momo-input__adornment']}>{prefix}</span>
        ) : null}
        {inputElement}
        {suffix ? (
          <span className={styles['momo-input__adornment']}>{suffix}</span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
