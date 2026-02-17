'use client';

import { cn } from '@utils/cn';
import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ComponentRef,
  type FocusEventHandler,
  type ForwardedRef,
  type JSX as JSXNamespace,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import styles from './tooltip.module.css';

type IntrinsicElement = keyof JSXNamespace.IntrinsicElements;

type TooltipProps<T extends IntrinsicElement = 'span'> = {
  /** Underlying HTML element for the trigger. Must be intrinsic for ref safety. @default 'span' */
  as?: T;
  /** Class applied to the outer wrapper `<span>` (controls layout like `align-self`). */
  className?: string;
  /** Class applied directly to the trigger element. */
  triggerClassName?: string;
  children: ReactNode;
  /**
   * Explicit content to render inside the tooltip bubble.
   * Falls back to `title`, then `aria-label` when not provided.
   */
  label?: ReactNode;
  /** Toggle the tooltip on/off without unmounting. @default true */
  isEnabled?: boolean;
  /** Native `title` attribute — also used as fallback tooltip content. */
  title?: string;
} & Omit<
  ComponentPropsWithoutRef<T>,
  'as' | 'className' | 'children' | 'title'
>;

type TooltipComponent = <T extends IntrinsicElement = 'span'>(
  props: TooltipProps<T> & { ref?: Ref<ComponentRef<T>> },
) => ReactElement | null;

/**
 * Tooltip that appears on hover / focus after a 500 ms delay.
 *
 * Wraps any intrinsic element (default `<span>`) with a positioned tooltip
 * bubble. The tooltip content resolves from `label` → `title` → `aria-label`,
 * and is hidden when none are present. Dismisses on `Escape`, blur, or
 * mouse-leave.
 *
 * Uses `aria-describedby` for screen-reader association and auto-assigns
 * `tabIndex={0}` on `<span>` triggers so they're keyboard-focusable.
 *
 * **Client component** — requires `'use client'`.
 *
 * @typeParam T - Intrinsic HTML element for the trigger. @default 'span'
 *
 * @example Text tooltip
 * ```tsx
 * <Tooltip title="Copy to clipboard">
 *   <Button variant="icon">
 *     <CopyIcon />
 *   </Button>
 * </Tooltip>
 * ```
 *
 * @example Rich label with JSX
 * ```tsx
 * <Tooltip label={<><strong>Tip:</strong> Click to edit</>}>
 *   <Typography>Hover me</Typography>
 * </Tooltip>
 * ```
 *
 * @example Disabled tooltip
 * ```tsx
 * <Tooltip title="Hidden" isEnabled={false}>
 *   <span>No tooltip</span>
 * </Tooltip>
 * ```
 */
function TooltipInner<T extends IntrinsicElement = 'span'>(
  props: TooltipProps<T>,
  forwardedRef: ForwardedRef<ComponentRef<T>>,
) {
  const {
    as,
    className,
    triggerClassName,
    children,
    label,
    isEnabled = true,
    title,
    tabIndex,
    onFocus,
    onBlur,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
    ...rest
  } = props;

  const ariaLabel = (rest as { 'aria-label'?: string })['aria-label'];
  const tooltipContent = label ?? title ?? ariaLabel ?? '';
  const hasContent =
    tooltipContent !== null &&
    tooltipContent !== undefined &&
    tooltipContent !== '';
  const tooltipId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const showTimeoutRef = useRef<number | null>(null);
  const componentTag = as || 'span';
  const Component = componentTag as T;
  const isTooltipVisible = isEnabled && hasContent && isVisible;

  const clearScheduledShow = useCallback(() => {
    if (showTimeoutRef.current) {
      window.clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
  }, []);

  const scheduleShow = useCallback(() => {
    if (!isEnabled || !hasContent) return;

    clearScheduledShow();
    showTimeoutRef.current = window.setTimeout(() => setIsVisible(true), 500);
  }, [clearScheduledShow, hasContent, isEnabled]);

  const hide = useCallback(() => {
    clearScheduledShow();
    setIsVisible(false);
  }, [clearScheduledShow]);

  useEffect(() => () => clearScheduledShow(), [clearScheduledShow]);

  useEffect(() => {
    if (!isEnabled) {
      clearScheduledShow();
    }
  }, [clearScheduledShow, isEnabled]);

  const describedBy = isTooltipVisible ? tooltipId : undefined;
  type TriggerElement = ComponentRef<T>;
  const userOnFocus = onFocus as FocusEventHandler<TriggerElement> | undefined;
  const userOnBlur = onBlur as FocusEventHandler<TriggerElement> | undefined;
  const userOnMouseEnter = onMouseEnter as
    | MouseEventHandler<TriggerElement>
    | undefined;
  const userOnMouseLeave = onMouseLeave as
    | MouseEventHandler<TriggerElement>
    | undefined;
  const userOnKeyDown = onKeyDown as
    | KeyboardEventHandler<TriggerElement>
    | undefined;

  const handleFocus: FocusEventHandler<TriggerElement> = event => {
    userOnFocus?.(event);
    scheduleShow();
  };

  const handleBlur: FocusEventHandler<TriggerElement> = event => {
    userOnBlur?.(event);
    hide();
  };

  const handleMouseEnter: MouseEventHandler<TriggerElement> = event => {
    userOnMouseEnter?.(event);
    scheduleShow();
  };

  const handleMouseLeave: MouseEventHandler<TriggerElement> = event => {
    userOnMouseLeave?.(event);
    hide();
  };

  const handleKeyDown: KeyboardEventHandler<TriggerElement> = event => {
    userOnKeyDown?.(event);
    if (event.key === 'Escape') {
      hide();
    }
  };

  const effectiveTabIndex =
    tabIndex ?? (componentTag === 'span' ? 0 : undefined);

  return (
    <span className={cn(styles['momo-tooltip__wrapper'], className)}>
      {createElement(
        Component,
        {
          ...rest,
          ref: forwardedRef,
          className: cn(styles['momo-tooltip__trigger'], triggerClassName),
          'aria-describedby': describedBy,
          tabIndex: effectiveTabIndex,
          onFocus: handleFocus,
          onBlur: handleBlur,
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
          onKeyDown: handleKeyDown,
        } as ComponentPropsWithRef<T>,
        children,
      )}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!isTooltipVisible}
        className={cn(
          styles['momo-tooltip__bubble'],
          isTooltipVisible && styles['momo-tooltip__bubble--visible'],
        )}
      >
        {tooltipContent}
      </span>
    </span>
  );
}

export const Tooltip = forwardRef(TooltipInner) as TooltipComponent;
