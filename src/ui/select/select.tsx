'use client';

import { Select as BaseSelect } from '@base-ui/react/select';
import { TriangleIcon } from '@ui/icons/triangle';
import { cn } from '@utils/cn';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import styles from './select.module.css';
import type {
  SelectComponent,
  SelectForwardedRef,
  SelectOptionValue,
  SelectProps,
} from './select.types';

/**
 * Accessible, stylable single-select dropdown.
 *
 * Renders a trigger button that opens a portal-based listbox via Base UI's
 * `Select`. Works with any option shape — provide accessor functions
 * (`getOptionLabel`, `getOptionValue`) to tell the component how to read your
 * data. Supports both controlled and uncontrolled modes. A hidden `<input>`
 * mirrors the selected value for HTML form submissions.
 *
 * **Client component** — requires `'use client'`.
 *
 * @typeParam T - Option item shape.
 *
 * @example Simple string options (controlled)
 * ```tsx
 * type Currency = { code: string; name: string };
 * const currencies: Currency[] = [
 *   { code: 'USD', name: 'US Dollar' },
 *   { code: 'EUR', name: 'Euro' },
 *   { code: 'COP', name: 'Colombian Peso' },
 * ];
 *
 * const [currency, setCurrency] = useState<Currency | null>(currencies[0]);
 *
 * <Select
 *   options={currencies}
 *   value={currency}
 *   onChange={setCurrency}
 *   getOptionLabel={o => o.name}
 *   getOptionValue={o => o.code}
 *   placeholder="Pick a currency"
 *   name="currency"
 * />
 * ```
 *
 * @example Custom option rendering
 * ```tsx
 * <Select
 *   options={users}
 *   getOptionLabel={u => u.name}
 *   getOptionValue={u => u.id}
 *   renderOption={(u, { isSelected }) => (
 *     <Flex gap={1} alignItems="center">
 *       <Avatar displayName={u.name} size="extra-small" />
 *       <span>{u.name}</span>
 *       {isSelected && <CheckIcon width={14} />}
 *     </Flex>
 *   )}
 *   onChange={setSelectedUser}
 * />
 * ```
 */
function useSelectInner<T>(props: SelectProps<T>, ref: SelectForwardedRef) {
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
  const isControlled = value !== undefined;
  const defaultOptionValue =
    defaultValue !== undefined && defaultValue !== null
      ? getOptionValue(defaultValue)
      : null;
  const [internalValue, setInternalValue] = useState<SelectOptionValue | null>(
    defaultOptionValue,
  );

  const selectedValue =
    value !== undefined && value !== null
      ? getOptionValue(value)
      : isControlled
        ? null
        : internalValue;

  const selectedOption = useMemo(() => {
    if (selectedValue === null || selectedValue === undefined) return null;
    return (
      options.find(option => getOptionValue(option) === selectedValue) ?? null
    );
  }, [getOptionValue, options, selectedValue]);

  const hasSelection = selectedOption !== null && selectedOption !== undefined;

  const setTriggerRef = useCallback(
    (node: HTMLButtonElement | null) => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as { current: HTMLButtonElement | null }).current = node;
      }
    },
    [ref],
  );

  useEffect(() => {
    if (isControlled) return;
    if (internalValue === null || internalValue === undefined) return;
    const exists = options.some(
      option => getOptionValue(option) === internalValue,
    );
    if (!exists) {
      setInternalValue(null);
      onChange?.(null);
    }
  }, [getOptionValue, internalValue, isControlled, onChange, options]);

  const renderedValue = renderValue
    ? renderValue(selectedOption)
    : hasSelection && getOptionLabel
      ? getOptionLabel(selectedOption as T)
      : placeholder;
  const computedAriaLabel =
    ariaLabel ?? (!ariaLabelledby ? placeholder : undefined);

  const handleValueChange = useCallback(
    (nextValue: SelectOptionValue | null) => {
      const option =
        nextValue === null || nextValue === undefined
          ? null
          : (options.find(opt => getOptionValue(opt) === nextValue) ?? null);
      if (!isControlled) {
        setInternalValue(nextValue);
      }
      onChange?.(option);
    },
    [getOptionValue, isControlled, onChange, options],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

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
      <BaseSelect.Root<SelectOptionValue>
        value={selectedValue}
        onValueChange={handleValueChange}
        onOpenChange={handleOpenChange}
        disabled={isDisabled}
      >
        <BaseSelect.Trigger
          ref={setTriggerRef}
          id={id}
          disabled={isDisabled}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          title={title}
          aria-label={computedAriaLabel}
          aria-labelledby={ariaLabelledby}
          className={styles['momo-select__trigger']}
        >
          <BaseSelect.Value
            className={cn(
              styles['momo-select__value'],
              !hasSelection && styles['momo-select__value--placeholder'],
            )}
          >
            {renderedValue}
          </BaseSelect.Value>
          <BaseSelect.Icon className={styles['momo-select__chevron']}>
            <TriangleIcon width={14} height={10} />
          </BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
          <BaseSelect.Positioner
            className={styles['momo-select__positioner']}
            align="start"
            sideOffset={6}
            side="bottom"
            alignItemWithTrigger={false}
          >
            <BaseSelect.Popup
              className={cn(styles['momo-select__dropdown'], dropdownClassName)}
            >
              <BaseSelect.List className={styles['momo-select__list']}>
                {options.map((option, index) => {
                  const key =
                    getOptionKey?.(option, index) ??
                    String(getOptionValue(option));
                  const optionValue = getOptionValue(option);
                  const isOptionDisabled = getOptionDisabled?.(option) ?? false;
                  const optionLabel = getOptionLabel(option);

                  return (
                    <BaseSelect.Item
                      key={key}
                      value={optionValue}
                      label={optionLabel}
                      disabled={isOptionDisabled}
                      render={(itemProps, state) => {
                        const content = renderOption
                          ? renderOption(option, {
                              isActive: Boolean(state.highlighted),
                              isSelected: Boolean(state.selected),
                              index,
                            })
                          : optionLabel;

                        return (
                          <div
                            {...itemProps}
                            className={cn(
                              styles['momo-select__option'],
                              itemProps.className,
                            )}
                            title={optionLabel}
                          >
                            {content}
                          </div>
                        );
                      }}
                    />
                  );
                })}
              </BaseSelect.List>
            </BaseSelect.Popup>
          </BaseSelect.Positioner>
        </BaseSelect.Portal>
      </BaseSelect.Root>
    </div>
  );
}

export const Select = forwardRef(useSelectInner) as SelectComponent;
