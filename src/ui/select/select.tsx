'use client';

import { TriangleIcon } from '@ui/icons/triangle';
import { cn } from '@utils/cn';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  useActiveOptionScroll,
  useDropdownPosition,
  useKeyboardNavigation,
} from './select.hooks';
import styles from './select.module.css';
import type {
  SelectComponent,
  SelectForwardedRef,
  SelectProps,
} from './select.types';

/**
 * Accessible, stylable single-select component with controlled and uncontrolled modes.
 *
 * Renders a trigger (combobox) that opens a portal-based listbox. Supports custom
 * rendering for trigger value and options, forwards standard select attributes
 * (`name`, `disabled`, `required`, `aria-*`, etc.), and mirrors the selected value to
 * a hidden input for HTML form submissions.
 *
 * @typeParam T - Option item shape.
 * @param props - Component props.
 * @param props.options - Array of options to render.
 * @param props.value - Controlled selected option (or null for no selection).
 * @param props.defaultValue - Initial selected option for uncontrolled usage.
 * @param props.onChange - Called with the next option (or null) when selection changes.
 * @param props.placeholder - Text shown when no selection is present.
 * @param props.getOptionLabel - Returns the display label for an option.
 * @param props.getOptionValue - Returns the form value/key for an option.
 * @param props.getOptionDisabled - Optional predicate to mark options as disabled.
 * @param props.getOptionKey - Optional custom key; defaults to option value.
 * @param props.renderOption - Optional custom renderer for list options.
 * @param props.renderValue - Optional custom renderer for the trigger value.
 * @param props.dropdownClassName - Optional class override for the dropdown wrapper.
 * @param props.onOpenChange - Optional callback fired when the dropdown opens/closes.
 * @param ref - Forwarded ref to the trigger element.
 */
function SelectInner<T>(props: SelectProps<T>, ref: SelectForwardedRef) {
  const listboxId = useId();
  const {
    className,
    style,
    placeholder = 'Select an option',
    value,
    defaultValue,
    getOptionLabel,
    renderValue,
    ...rest
  } = props;

  const {
    options,
    getOptionValue,
    getOptionDisabled,
    getOptionKey,
    renderOption,
    dropdownClassName,
    onChange,
    onOpenChange,
    ...nativeSelectProps
  } = rest;

  const {
    disabled,
    id,
    name,
    form,
    autoFocus,
    tabIndex,
    title,
    required,

    ['aria-label']: ariaLabel,

    ['aria-labelledby']: ariaLabelledby,
  } = nativeSelectProps as {
    disabled?: boolean;
    id?: string;
    name?: string;
    form?: string;
    autoFocus?: boolean;
    tabIndex?: number;
    title?: string;
    required?: boolean;
    'aria-label'?: string;
    'aria-labelledby'?: string;
  };
  const isDisabled = Boolean(disabled);

  const [isOpen, setIsOpen] = useState(false);
  const { triggerRef, dropdownRef, dropdownPosition, attachPositionListeners } =
    useDropdownPosition({ gap: 6 });
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [internalValue, setInternalValue] = useState<T | null>(
    value ?? defaultValue ?? null,
  );
  const { listRef, activeOptionRef, ensureVisible } = useActiveOptionScroll();

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as { current: HTMLButtonElement | null }).current = node;
      }
    },
    [ref, triggerRef],
  );

  useLayoutEffect(() => {
    if (!isOpen) return;
    const cleanup = attachPositionListeners(true);
    return cleanup;
  }, [attachPositionListeners, isOpen]);

  const toggleOpen = useCallback(() => {
    if (isDisabled) return;
    setIsOpen(prev => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }, [isDisabled, onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) return prev;
      onOpenChange?.(false);
      return false;
    });
  }, [onOpenChange]);

  const isOptionDisabled = useCallback(
    (option: T) => getOptionDisabled?.(option) ?? false,
    [getOptionDisabled],
  );

  const selectedOption =
    value !== undefined ? (value ?? null) : (internalValue ?? null);
  const hasSelection = selectedOption !== null && selectedOption !== undefined;
  const selectedValue = hasSelection
    ? getOptionValue(selectedOption as T)
    : null;

  const selectedIndex = hasSelection
    ? options.findIndex(option => getOptionValue(option) === selectedValue)
    : -1;

  const findNextEnabled = useCallback(
    (start: number, direction: 1 | -1) => {
      if (!options.length) return -1;
      let idx = start;
      for (let i = 0; i < options.length; i += 1) {
        idx = (idx + direction + options.length) % options.length;
        if (!isOptionDisabled(options[idx])) return idx;
      }
      return -1;
    },
    [isOptionDisabled, options],
  );

  const firstEnabledIndex = useCallback(
    () => findNextEnabled(-1, 1),
    [findNextEnabled],
  );

  useLayoutEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
      return;
    }

    if (selectedIndex >= 0 && !isOptionDisabled(options[selectedIndex])) {
      setActiveIndex(selectedIndex);
      return;
    }

    setActiveIndex(firstEnabledIndex());
  }, [firstEnabledIndex, isOpen, isOptionDisabled, options, selectedIndex]);

  useLayoutEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    ensureVisible(isOpen, activeIndex);
  }, [activeIndex, ensureVisible, isOpen]);

  const openAtIndex = useCallback(
    (index: number) => {
      if (isDisabled) return;
      setIsOpen(true);
      setActiveIndex(index >= 0 ? index : firstEnabledIndex());
      onOpenChange?.(true);
    },
    [firstEnabledIndex, isDisabled, onOpenChange],
  );

  const selectOption = useCallback(
    (option: T | null) => {
      if (isDisabled) return;
      if (value === undefined) {
        setInternalValue(option);
      }
      onChange?.(option);
      close();
    },
    [close, isDisabled, onChange, value],
  );

  const { handleKeyDown } = useKeyboardNavigation<T>({
    disabled: isDisabled,
    isOpen,
    selectedIndex,
    options,
    isOptionDisabled,
    firstEnabledIndex,
    findNextEnabled,
    openAtIndex,
    selectOption,
    activeIndex,
    setActiveIndex,
    onRequestClose: close,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerOrFocus = (event: Event) => {
      const target = event.target as Node | null;
      if (!target) return;
      const triggerEl = triggerRef.current;
      const dropdownEl = dropdownRef.current;
      if (triggerEl?.contains(target) || dropdownEl?.contains(target)) return;
      close();
    };

    document.addEventListener('pointerdown', handlePointerOrFocus);
    document.addEventListener('focusin', handlePointerOrFocus);
    return () => {
      document.removeEventListener('pointerdown', handlePointerOrFocus);
      document.removeEventListener('focusin', handlePointerOrFocus);
    };
  }, [close, dropdownRef, isOpen, triggerRef]);

  useEffect(() => {
    if (value !== undefined) return;
    if (internalValue === null || internalValue === undefined) return;
    const currentValue = getOptionValue(internalValue);
    const exists = options.some(
      option => getOptionValue(option) === currentValue,
    );
    if (!exists) {
      setInternalValue(null);
      onChange?.(null);
    }
  }, [getOptionValue, internalValue, onChange, options, value]);

  const renderedValue = renderValue
    ? renderValue(selectedOption)
    : hasSelection && getOptionLabel
      ? getOptionLabel(selectedOption as T)
      : placeholder;
  const computedAriaLabel =
    ariaLabel ?? (!ariaLabelledby ? placeholder : undefined);

  return (
    <div className={cn(styles['momo-select'], className)} style={style}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selectedValue ?? ''}
          form={form}
          disabled={isDisabled}
          required={required}
          aria-hidden="true"
        />
      ) : null}
      <button
        ref={setTriggerRef}
        type="button"
        className={cn(
          styles['momo-select__trigger'],
          isOpen && styles['momo-select__trigger--open'],
          isDisabled && styles['momo-select__trigger--disabled'],
        )}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          isOpen && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        disabled={isDisabled}
        name={name}
        id={id}
        form={form}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        title={title}
        aria-label={computedAriaLabel}
        aria-labelledby={ariaLabelledby}
        onClick={toggleOpen}
        onBlur={close}
        onKeyDown={handleKeyDown}
      >
        <span
          className={cn(
            styles['momo-select__value'],
            !hasSelection && styles['momo-select__value--placeholder'],
          )}
        >
          {renderedValue}
        </span>
        <span className={styles['momo-select__chevron']} aria-hidden="true">
          <TriangleIcon width={14} height={10} />
        </span>
      </button>
      {typeof document !== 'undefined' && isOpen
        ? createPortal(
            <div
              className={cn(
                styles['momo-select__dropdown'],
                isOpen && styles['momo-select__dropdown--open'],
                dropdownClassName,
              )}
              ref={dropdownRef}
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }}
            >
              <ul
                className={styles['momo-select__list']}
                role="listbox"
                id={listboxId}
                ref={listRef}
              >
                {options.map((option, index) => {
                  const key =
                    getOptionKey?.(option, index) ??
                    String(getOptionValue(option));
                  const optionValue = getOptionValue(option);
                  const isDisabled = getOptionDisabled?.(option) ?? false;
                  const isSelected =
                    selectedValue !== null && selectedValue === optionValue;
                  const isActive = index === activeIndex;
                  const optionLabel = getOptionLabel(option);
                  const content = renderOption
                    ? renderOption(option, {
                        isActive,
                        isSelected,
                        index,
                      })
                    : getOptionLabel(option);

                  return (
                    <li
                      key={key}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={isDisabled}
                      id={`${listboxId}-option-${index}`}
                      ref={isActive ? activeOptionRef : undefined}
                      aria-label={optionLabel}
                      title={optionLabel}
                      className={cn(
                        styles['momo-select__option'],
                        isSelected && styles['momo-select__option--selected'],
                        isActive && styles['momo-select__option--active'],
                        isDisabled && styles['momo-select__option--disabled'],
                      )}
                      onMouseDown={event => {
                        event.preventDefault();
                        if (!isDisabled) {
                          setActiveIndex(index);
                          selectOption(option);
                        }
                      }}
                    >
                      {content}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export const Select = forwardRef(SelectInner) as SelectComponent;
