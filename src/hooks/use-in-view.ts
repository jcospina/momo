import { type RefObject, useEffect, useState } from 'react';

export type UseInViewOptions = {
  threshold?: number | number[];
  rootMargin?: string;
  once?: boolean;
};

export function useInView(
  ref: RefObject<HTMLElement | null>,
  options: UseInViewOptions = {},
): boolean {
  const { threshold = 0, rootMargin, once = false } = options;
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin, once]);

  return inView;
}
