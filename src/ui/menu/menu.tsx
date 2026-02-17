'use client';

import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '@utils/cn';
import { useId } from 'react';
import styles from './menu.module.css';
import type { MenuProps } from './menu.types';

/**
 * Dropdown menu powered by Base UI's `Menu`.
 *
 * Wraps a trigger element and renders a portal-based popup with a list of
 * items and optional separators. Supports hover-to-open, configurable
 * placement, and per-item tone (e.g. danger for destructive actions).
 *
 * **Client component** — requires `'use client'`.
 *
 * @example Context menu on an avatar
 * ```tsx
 * <Menu
 *   items={[
 *     { type: 'item', label: 'Profile', onSelect: goToProfile },
 *     { type: 'separator' },
 *     { type: 'item', label: 'Log out', onSelect: logout, tone: 'danger' },
 *   ]}
 * >
 *   <Avatar displayName="Alice" />
 * </Menu>
 * ```
 *
 * @example Hover menu with icon items
 * ```tsx
 * <Menu
 *   openOnHover
 *   hoverDelay={200}
 *   side="right"
 *   items={[
 *     { type: 'item', label: 'Edit', icon: <EditIcon />, onSelect: edit },
 *     { type: 'item', label: 'Delete', icon: <CloseIcon />, onSelect: del, tone: 'danger' },
 *   ]}
 * >
 *   <Button variant="icon"><ThreeDotsIcon /></Button>
 * </Menu>
 * ```
 */
export function Menu({
  children,
  items,
  openOnHover,
  hoverDelay,
  closeDelay,
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  className,
  onOpenChange,
}: MenuProps) {
  const popupId = useId();
  const openOnHoverProps = openOnHover
    ? {
        openOnHover: true,
        delay: hoverDelay,
        closeDelay,
      }
    : {};

  return (
    <BaseMenu.Root onOpenChange={onOpenChange}>
      <BaseMenu.Trigger
        nativeButton={false}
        render={props => (
          <span
            {...props}
            className={cn(styles['momo-menu__trigger'], props.className)}
          >
            {children}
          </span>
        )}
        {...openOnHoverProps}
      />
      <BaseMenu.Portal>
        <BaseMenu.Positioner
          className={styles['momo-menu__positioner']}
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          <BaseMenu.Popup
            id={popupId}
            className={cn(styles['momo-menu'], className)}
          >
            {items?.length
              ? items.map((item, index) => {
                  const key = `${item.type}-${index}`;
                  if (item.type === 'separator') {
                    return (
                      <BaseMenu.Separator
                        key={key}
                        className={styles['momo-menu__separator']}
                      />
                    );
                  }

                  const {
                    label,
                    icon,
                    onSelect,
                    disabled,
                    closeOnSelect,
                    tone,
                  } = item;
                  const toneClassName =
                    tone === 'danger'
                      ? styles['momo-menu__item--danger']
                      : undefined;

                  return (
                    <BaseMenu.Item
                      key={key}
                      className={cn(styles['momo-menu__item'], toneClassName)}
                      onClick={onSelect}
                      disabled={disabled}
                      closeOnClick={closeOnSelect}
                    >
                      <span className={styles['momo-menu__item-label']}>
                        {label}
                      </span>
                      {icon ? (
                        <span className={styles['momo-menu__item-icon']}>
                          {icon}
                        </span>
                      ) : null}
                    </BaseMenu.Item>
                  );
                })
              : null}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
