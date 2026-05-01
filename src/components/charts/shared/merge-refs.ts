import type { MutableRefObject, Ref } from 'react';

/**
 * Compose multiple React refs into a single callback ref. Used when a chart
 * needs to attach both the visx `containerRef` (for tooltip positioning) and
 * the touch-dismiss ref to the same DOM node.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>) {
  return (node: T | null) => {
    refs.forEach(ref => {
      if (!ref) return;
      if (typeof ref === 'function') {
        ref(node);
      } else {
        (ref as MutableRefObject<T | null>).current = node;
      }
    });
  };
}
