export type PropsWithClassName<P = object> = P & {
  className?: string;
};

export type PaddingProperty =
  | 'padding'
  | 'paddingX'
  | 'paddingY'
  | 'paddingTop'
  | 'paddingLeft'
  | 'paddingBottom'
  | 'paddingRight';
export type PaddingProps = {
  [K in PaddingProperty]?: number;
};

export type MarginProperty =
  | 'margin'
  | 'marginX'
  | 'marginY'
  | 'marginTop'
  | 'marginLeft'
  | 'marginBottom'
  | 'marginRight';

export type MarginProps = {
  [K in MarginProperty]?: number | 'auto';
};
