export type ToggleGroupItem = {
  label: string;
  value: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type ToggleGroupProps = {
  className?: string;
  items: ToggleGroupItem[];
  defaultValue?: string[];
  value?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  disabled?: boolean;
};
