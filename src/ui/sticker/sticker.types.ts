import type { ComponentProps, ElementType, PropsWithChildren } from 'react';

export type StickerVariant = 'paper' | 'primary';
export type StickerShape = 'tag' | 'pill';

interface BaseStickerProps extends PropsWithChildren {
  /**
   * Marks the sticker as the selected one (for example the current page):
   * sky fill, placed with a slight tilt. Pair it with `aria-current` or
   * `aria-pressed` on the element. @default false
   */
  active?: boolean;
  /** `paper` for plain choices, `primary` for a call to action. @default 'paper' */
  variant?: StickerVariant;
  /** `tag` is the rounded rectangle, `pill` is fully rounded. @default 'tag' */
  shape?: StickerShape;
}

export type StickerProps<T extends ElementType = 'button'> = {
  /** Render as a different element, e.g. `a` or Next's `Link`. @default 'button' */
  as?: T;
} & BaseStickerProps &
  Omit<ComponentProps<T>, keyof PropsWithChildren | 'as'>;
