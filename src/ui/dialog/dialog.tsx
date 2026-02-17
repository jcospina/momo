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

/**
 * Headless controller hook for {@link Dialog}.
 *
 * Returns open/close state, imperative helpers, and pre-built props to
 * spread onto both the trigger element and the `<Dialog>` component.
 *
 * @example
 * ```tsx
 * const { triggerProps, dialogProps, closeDialog } = useDialogController();
 *
 * <Button variant="primary" {...triggerProps}>Open</Button>
 * <Dialog
 *   controller={{ ...triggerProps, dialogProps, closeDialog, ... }}
 *   title="Confirm"
 *   content={<p>Are you sure?</p>}
 *   actions={
 *     <>
 *       <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
 *       <Button variant="primary" onClick={handleConfirm}>Yes</Button>
 *     </>
 *   }
 * />
 * ```
 */
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

/**
 * Modal dialog with title, content, and action slots.
 *
 * Renders a portal-based popup with a backdrop overlay, powered by Base UI's
 * `Dialog`. Pair with {@link useDialogController} to manage open/close state
 * and accessibility attributes.
 *
 * **Client component** — requires `'use client'`.
 *
 * @example Confirmation dialog
 * ```tsx
 * const controller = useDialogController();
 *
 * <Button variant="secondary" {...controller.triggerProps}>
 *   Delete expense
 * </Button>
 *
 * <Dialog
 *   controller={controller}
 *   title="Delete expense?"
 *   content={<Typography>This action cannot be undone.</Typography>}
 *   actions={
 *     <>
 *       <Button variant="secondary" onClick={controller.closeDialog}>
 *         Cancel
 *       </Button>
 *       <Button variant="primary" onClick={handleDelete}>
 *         Delete
 *       </Button>
 *     </>
 *   }
 * />
 * ```
 *
 * @example Simple info dialog (default close button)
 * ```tsx
 * <Dialog
 *   controller={controller}
 *   title="About MoMo"
 *   content={<Typography>Version 1.0</Typography>}
 * />
 * ```
 */
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
