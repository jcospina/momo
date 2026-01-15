import { useEffect } from 'react';

import type { UseEmblaCarouselType } from 'embla-carousel-react';

type EmblaApi = UseEmblaCarouselType[1];
export type EmblaSyncApi = Pick<
  NonNullable<EmblaApi>,
  'on' | 'off' | 'selectedScrollSnap' | 'scrollTo'
>;

type UseEmblaSyncOptions = {
  activeIndex: number;
  onSelect: (index: number) => void;
};

export function useEmblaSync(
  emblaApi: EmblaSyncApi | undefined,
  { activeIndex, onSelect }: UseEmblaSyncOptions,
) {
  useEffect(() => {
    if (!emblaApi) return;
    const handleSelect = () => onSelect(emblaApi.selectedScrollSnap());
    emblaApi.on('select', handleSelect);
    return () => {
      emblaApi.off('select', handleSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    if (emblaApi.selectedScrollSnap() === activeIndex) return;
    emblaApi.scrollTo(activeIndex, true);
  }, [activeIndex, emblaApi]);
}
