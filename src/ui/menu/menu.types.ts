import type { ReactElement, ReactNode } from 'react';

export type MenuItemTone = 'default' | 'danger';

export type MenuItemConfig =
  | {
      type: 'item';
      label: ReactNode;
      icon?: ReactNode;
      onSelect?: () => void;
      disabled?: boolean;
      closeOnSelect?: boolean;
      tone?: MenuItemTone;
    }
  | {
      type: 'separator';
    };

export type MenuProps = {
  children: ReactElement;
  items?: MenuItemConfig[];
  openOnHover?: boolean;
  hoverDelay?: number;
  closeDelay?: number;
  side?: 'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  onOpenChange?: (open: boolean) => void;
};
