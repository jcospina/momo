import React, { PropsWithChildren } from 'react';

interface BasePanelProps extends PropsWithChildren {
  className?: string;
}
export type PanelProps<T extends React.ElementType = 'div'> = {
  as?: T;
} & BasePanelProps &
  Omit<React.ComponentPropsWithoutRef<T>, keyof BasePanelProps | 'as'>;
