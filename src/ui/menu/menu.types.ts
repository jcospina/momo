import type { ReactElement, ReactNode } from 'react';

/** Colour tone for a menu item — `'danger'` renders in a destructive red. */
export type MenuItemTone = 'default' | 'danger';

/**
 * Describes a single entry in the menu.
 *
 * Use `type: 'item'` for actionable rows and `type: 'separator'` for a
 * visual divider between groups.
 */
export type MenuItemConfig =
  | {
      type: 'item';
      /** Display label (can be a string or JSX). */
      label: ReactNode;
      /** Optional trailing icon. */
      icon?: ReactNode;
      /** Fires when the item is selected. */
      onSelect?: () => void;
      /** Grey-out and prevent selection. */
      disabled?: boolean;
      /** Close the menu after selecting this item. */
      closeOnSelect?: boolean;
      /** Colour tone. @default 'default' */
      tone?: MenuItemTone;
    }
  | {
      type: 'separator';
    };

export type MenuProps = {
  /** Trigger element — rendered inside a `<span>` with menu-trigger aria attrs. */
  children: ReactElement;
  /** Array of items (and separators) to display. */
  items?: MenuItemConfig[];
  /** Open on hover instead of click. @default false */
  openOnHover?: boolean;
  /** Delay (ms) before the menu opens on hover. */
  hoverDelay?: number;
  /** Delay (ms) before the menu closes after mouse leaves. */
  closeDelay?: number;
  /** Which side of the trigger to place the popup. @default 'bottom' */
  side?: 'top' | 'bottom' | 'left' | 'right' | 'inline-start' | 'inline-end';
  /** Alignment along the side axis. @default 'start' */
  align?: 'start' | 'center' | 'end';
  /** Pixel offset from the trigger edge. @default 8 */
  sideOffset?: number;
  /** Class applied to the popup container. */
  className?: string;
  /** Fires when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
};
