/** Configuration for a single toggle button inside a {@link ToggleGroup}. */
export type ToggleGroupItem = {
  /** Display text (also used as `aria-label`). */
  label: string;
  /** Unique value identifying this toggle. */
  value: string;
  /** Optional click handler (fires in addition to group-level `onValueChange`). */
  onClick?: () => void;
  /** Disable this individual toggle. */
  disabled?: boolean;
};

export type ToggleGroupProps = {
  className?: string;
  /** Array of toggle items to render. */
  items: ToggleGroupItem[];
  /** Initial selected values (uncontrolled). */
  defaultValue?: string[];
  /** Controlled selected values. */
  value?: string[];
  /** Fires with the updated selection array when any toggle is pressed. */
  onValueChange?: (value: string[]) => void;
  /** Allow multiple simultaneous selections. @default false */
  multiple?: boolean;
  /** Disable the entire group. @default false */
  disabled?: boolean;
};
