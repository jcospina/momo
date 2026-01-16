'use client';

import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { Button } from '@ui/button/button';
import { Divider } from '@ui/divider/divider';
import { Flex } from '@ui/flex/flex';
import { Padding } from '@ui/padding/padding';
import { cn } from '@utils/cn';
import { useCallback, useId, useMemo, useState } from 'react';
import styles from './dialog.module.css';
import type {
  DialogController,
  DialogControllerOptions,
  DialogProps,
  DialogTriggerProps,
} from './dialog.types';

export function useDialogController(
  options: DialogControllerOptions = {},
): DialogController {
  const { defaultOpen = false, onOpenChange, id } = options;
  const [open, setOpen] = useState(defaultOpen);
  const generatedId = useId();
  const baseId = id ?? `dialog-${generatedId}`;
  const triggerId = `${baseId}-trigger`;
  const popupId = `${baseId}-popup`;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [onOpenChange],
  );

  const openDialog = useCallback(
    () => handleOpenChange(true),
    [handleOpenChange],
  );
  const closeDialog = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );
  const toggleDialog = useCallback(
    () => handleOpenChange(!open),
    [handleOpenChange, open],
  );

  const triggerProps: DialogTriggerProps = useMemo(
    () => ({
      id: triggerId,
      onClick: () => openDialog(),
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      'aria-controls': popupId,
    }),
    [open, openDialog, popupId, triggerId],
  );

  const dialogProps = useMemo(
    () => ({
      open,
      onOpenChange: handleOpenChange,
      triggerId,
      popupId,
    }),
    [handleOpenChange, open, popupId, triggerId],
  );

  return {
    open,
    onOpenChange: handleOpenChange,
    openDialog,
    closeDialog,
    toggleDialog,
    triggerProps,
    dialogProps,
  };
}

export function Dialog({
  controller,
  title,
  content,
  actions,
  className,
}: DialogProps) {
  const { dialogProps } = controller;

  return (
    <BaseDialog.Root
      open={dialogProps.open}
      onOpenChange={dialogProps.onOpenChange}
      triggerId={dialogProps.triggerId}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles['momo-dialog__backdrop']} />
        <BaseDialog.Viewport className={styles['momo-dialog__viewport']}>
          <BaseDialog.Popup
            id={dialogProps.popupId}
            className={cn(styles['momo-dialog'], className)}
          >
            <Padding as="header" padding={3}>
              <BaseDialog.Title className={styles['momo-dialog__title']}>
                {title}
              </BaseDialog.Title>
            </Padding>
            <Divider />
            <BaseDialog.Description
              render={props => (
                <div
                  {...props}
                  className={cn(
                    styles['momo-dialog__content'],
                    props.className,
                  )}
                >
                  {props.children}
                </div>
              )}
            >
              {content}
            </BaseDialog.Description>
            <Divider />
            <Flex
              paddingX={3}
              paddingY={2}
              justifyContent="space-between"
              gap={2}
              isFullWidth
            >
              {actions ?? (
                <BaseDialog.Close
                  render={props => (
                    <Button variant="secondary" {...props}>
                      Close
                    </Button>
                  )}
                />
              )}
            </Flex>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
