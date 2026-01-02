'use client';

import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '@utils/cn';
import { useId } from 'react';
import styles from './menu.module.css';
import type { MenuProps } from './menu.types';

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
