import {
  PropsWithChildren,
  type ComponentPropsWithoutRef,
  type ElementType,
} from 'react';
type Sizes = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type Weight = 'light' | 'regular' | 'bold';

type Transform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

interface BaseTypographyProps extends PropsWithChildren {
  size?: Sizes;
  weight?: Weight;
  transform?: Transform;
}
export type TypographyProps<T extends ElementType = 'p'> = {
  as?: T;
} & BaseTypographyProps &
  Omit<ComponentPropsWithoutRef<T>, keyof PropsWithChildren | 'as'>;
