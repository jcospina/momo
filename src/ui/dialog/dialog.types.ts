import type { MouseEventHandler, ReactNode } from 'react';

export type DialogControllerOptions = {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
};

export type DialogTriggerProps = {
  id: string;
  onClick: MouseEventHandler<HTMLElement>;
  'aria-haspopup': 'dialog';
  'aria-expanded': boolean;
  'aria-controls': string;
};

export type DialogController = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openDialog: () => void;
  closeDialog: () => void;
  toggleDialog: () => void;
  triggerProps: DialogTriggerProps;
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    triggerId: string;
    popupId: string;
  };
};

export type DialogProps = {
  controller: DialogController;
  title: ReactNode;
  content: ReactNode;
  actions?: ReactNode;
  className?: string;
};
