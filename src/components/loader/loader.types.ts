import type { PropsWithClassName } from '@lib-types/common';

export type LoaderSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type LoaderProps = PropsWithClassName<{
  size?: LoaderSize;
}>;
