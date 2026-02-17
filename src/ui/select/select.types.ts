import type {
  ForwardedRef,
  ReactElement,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
} from 'react';

/** Element type exposed via the forwarded ref (the trigger button). */
export type SelectRef = HTMLButtonElement;

/** Primitive value type used to identify options internally. */
export type SelectOptionValue = string | number;

/** Callback shape for value changes — receives the full option object or `null`. */
export type SelectValueChangeHandler<T> = (next: T | null) => void;

/** Callback shape for dropdown open/close. */
export type SelectOpenChangeHandler = (isOpen: boolean) => void;

/** State bag passed to {@link SelectRenderers.renderOption}. */
export type SelectRenderOptionState = {
  /** `true` when the option is keyboard-highlighted. */
  isActive: boolean;
  /** `true` when the option is the current selection. */
  isSelected: boolean;
  /** Zero-based index in the options array. */
  index: number;
};

/** Custom render functions for trigger value and dropdown options. */
export type SelectRenderers<T> = {
  /** Custom renderer for each option row in the dropdown. */
  renderOption?: (option: T, state: SelectRenderOptionState) => ReactNode;
  /** Custom renderer for the trigger area. Receives the selected option or `null`. */
  renderValue?: (option: T | null) => ReactNode;
};

/**
 * Accessor functions that let {@link Select} work with any option shape.
 *
 * @typeParam T - Option item shape.
 */
export type SelectOptionAccessors<T> = {
  /** Return a human-readable display label for an option. */
  getOptionLabel: (option: T) => string;
  /** Return the primitive value (used for equality + hidden input). */
  getOptionValue: (option: T) => SelectOptionValue;
  /** Return `true` to grey-out an option. */
  getOptionDisabled?: (option: T) => boolean;
  /** Custom React key; defaults to the option value. */
  getOptionKey?: (option: T, index: number) => string;
};

/** Native `<select>` attributes forwarded to the trigger. */
export type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'multiple' | 'size' | 'value' | 'defaultValue' | 'onChange' | 'children'
>;

export type SelectBaseProps<T> = NativeSelectProps & {
  /** Array of options to render in the dropdown. */
  options: T[];
  /** Controlled selected option (pass `null` for no selection). */
  value?: T | null;
  /** Initial selected option for uncontrolled usage. */
  defaultValue?: T | null;
  /** Fires with the next option (or `null`) when the selection changes. */
  onChange?: SelectValueChangeHandler<T>;
  /** Placeholder text shown when nothing is selected. @default 'Select an option' */
  placeholder?: string;
  /** Class override for the dropdown popup wrapper. */
  dropdownClassName?: string;
  /** Fires when the dropdown opens or closes. */
  onOpenChange?: SelectOpenChangeHandler;
};

/**
 * Full prop set for {@link Select}.
 *
 * @typeParam T - Option item shape.
 */
export type SelectProps<T> = SelectBaseProps<T> &
  SelectOptionAccessors<T> &
  SelectRenderers<T>;

/** Branded component type to preserve generic `T` across `forwardRef`. */
export type SelectComponent = <T>(
  props: SelectProps<T> & { ref?: Ref<SelectRef> },
) => ReactElement | null;

export type SelectForwardedRef = ForwardedRef<SelectRef>;
