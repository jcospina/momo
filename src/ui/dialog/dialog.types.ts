import type { MouseEventHandler, ReactNode } from 'react';

/** Options accepted by {@link useDialogController}. */
export type DialogControllerOptions = {
  /** Start the dialog in an open state. @default false */
  defaultOpen?: boolean;
  /** Callback fired whenever the dialog opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Custom base ID — auto-generated when omitted. Used to derive trigger and popup IDs. */
  id?: string;
};

/**
 * Aria attributes to spread onto any element that should open the dialog.
 * Returned by `controller.triggerProps`.
 */
export type DialogTriggerProps = {
  id: string;
  onClick: MouseEventHandler<HTMLElement>;
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
  'aria-controls': string;
};

/**
 * State and helpers returned by {@link useDialogController}.
 *
 * Pass `controller` to `<Dialog>` and spread `triggerProps` onto the
 * element that should open the dialog.
 */
export type DialogController = {
  /** Whether the dialog is currently open. */
  open: boolean;
  /** Set the open state directly. */
  onOpenChange: (open: boolean) => void;
  /** Open the dialog. */
  openDialog: () => void;
  /** Close the dialog. */
  closeDialog: () => void;
  /** Toggle the dialog open/closed. */
  toggleDialog: () => void;
  /** Spread these onto the trigger element (button, link, etc.). */
  triggerProps: DialogTriggerProps;
  /** Internal props consumed by `<Dialog>` — pass as `controller.dialogProps`. */
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    triggerId: string;
    popupId: string;
  };
};

export type DialogProps = {
  /** Controller instance from {@link useDialogController}. */
  controller: DialogController;
  /** Header title content. */
  title: ReactNode;
  /** Body content rendered between the title and action dividers. */
  content: ReactNode;
  /** Footer actions — defaults to a single "Close" button when omitted. */
  actions?: ReactNode;
  /** Class applied to the popup container. */
  className?: string;
};
