import type {
  ForwardedRef,
  ReactElement,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
} from 'react';

export type SelectRef = HTMLButtonElement;

export type SelectOptionValue = string | number;
export type SelectValueChangeHandler<T> = (next: T | null) => void;
export type SelectOpenChangeHandler = (isOpen: boolean) => void;

export type SelectRenderOptionState = {
  isActive: boolean;
  isSelected: boolean;
  index: number;
};

export type SelectRenderers<T> = {
  renderOption?: (option: T, state: SelectRenderOptionState) => ReactNode;
  renderValue?: (option: T | null) => ReactNode;
};

export type SelectOptionAccessors<T> = {
  getOptionLabel: (option: T) => string;
  getOptionValue: (option: T) => SelectOptionValue;
  getOptionDisabled?: (option: T) => boolean;
  getOptionKey?: (option: T, index: number) => string;
};

export type NativeSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'multiple' | 'size' | 'value' | 'defaultValue' | 'onChange' | 'children'
>;

export type SelectBaseProps<T> = NativeSelectProps & {
  options: T[];
  value?: T | null;
  defaultValue?: T | null;
  onChange?: SelectValueChangeHandler<T>;
  placeholder?: string;
  dropdownClassName?: string; // light-touch override for dropdown wrapper only
  onOpenChange?: SelectOpenChangeHandler;
};

export type SelectProps<T> = SelectBaseProps<T> &
  SelectOptionAccessors<T> &
  SelectRenderers<T>;

export type SelectComponent = <T>(
  props: SelectProps<T> & { ref?: Ref<SelectRef> },
) => ReactElement | null;

export type SelectForwardedRef = ForwardedRef<SelectRef>;
