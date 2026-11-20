/**
 * A tiny block-layout model for jsdom, which has no layout engine.
 *
 * - A scroller is an element with `data-fake-client-height`. With an inline
 *   `display: none` it has no size, like a hidden chat panel.
 * - An element with `data-fake-height` is that tall; any other element is as
 *   tall as its children stacked vertically (no margins or padding).
 * - `getBoundingClientRect()` places scroller descendants by their offset in
 *   the content minus the scroller's `scrollTop`, with the scroller's top at 0.
 * - `scrollTop` is clamped to the scrollable range, and changing it dispatches
 *   `scroll` asynchronously (as a microtask), like in browsers. Await
 *   `userScrollTo()` or `flushScrollEvents()` before asserting.
 * - `ResizeObserver` is replaced by `FakeResizeObserver`; call
 *   `notifyResize()` after changing a `data-fake-height`.
 *
 * Install it in `beforeAll` and remove it in `afterAll`.
 */

type Restore = () => void;

const scrollTops = new WeakMap<Element, number>();

function isScroller(el: Element) {
  return el.hasAttribute('data-fake-client-height');
}

function isHidden(el: Element) {
  return (el as HTMLElement).style?.display === 'none';
}

function fakeClientHeight(el: Element) {
  if (isHidden(el)) return 0;
  return Number(el.getAttribute('data-fake-client-height') ?? 0);
}

function fakeHeight(el: Element): number {
  if (isHidden(el)) return 0;
  const own = el.getAttribute('data-fake-height');
  if (own !== null) return Number(own);
  let total = 0;
  for (const child of el.children) {
    total += fakeHeight(child);
  }
  return total;
}

function contentHeight(scroller: Element) {
  if (isHidden(scroller)) return 0;
  let total = 0;
  for (const child of scroller.children) {
    total += fakeHeight(child);
  }
  return total;
}

function maxScrollTop(scroller: Element) {
  return Math.max(0, contentHeight(scroller) - fakeClientHeight(scroller));
}

function closestScroller(el: Element) {
  let parent = el.parentElement;
  while (parent && !isScroller(parent)) {
    parent = parent.parentElement;
  }
  return parent;
}

/** Offset of `el` from the top of its scroller's content. */
function contentOffset(el: Element, scroller: Element): number {
  const parent = el.parentElement;
  if (!parent) return 0;
  let offset = parent === scroller ? 0 : contentOffset(parent, scroller);
  for (const sibling of parent.children) {
    if (sibling === el) break;
    offset += fakeHeight(sibling);
  }
  return offset;
}

function rect(top: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    height,
    toJSON: () => ({}),
  };
}

function fakeRect(el: Element): DOMRect {
  if (isScroller(el)) return rect(0, fakeClientHeight(el));
  const scroller = closestScroller(el);
  if (!scroller) return rect(0, 0);
  const top = contentOffset(el, scroller) - getScrollTop(scroller);
  return rect(top, fakeHeight(el));
}

function getScrollTop(el: Element) {
  return scrollTops.get(el) ?? 0;
}

function setScrollTop(el: Element, value: number) {
  const max = isScroller(el) ? maxScrollTop(el) : 0;
  const next = Math.min(Math.max(0, value), max);
  if (next === getScrollTop(el)) return;
  scrollTops.set(el, next);
  queueMicrotask(() => {
    el.dispatchEvent(new Event('scroll'));
  });
}

const resizeObservers = new Set<FakeResizeObserver>();

export class FakeResizeObserver {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe() {
    resizeObservers.add(this);
  }

  unobserve() {
    // Observers here watch everything; `notifyResize()` decides when they run.
  }

  disconnect() {
    resizeObservers.delete(this);
  }

  notify() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

/** Runs every connected ResizeObserver callback, like the browser after layout. */
export function notifyResize() {
  for (const observer of [...resizeObservers]) {
    observer.notify();
  }
}

/** Lets queued `scroll` events and MutationObserver callbacks run. */
export async function flushScrollEvents() {
  for (let i = 0; i < 3; i += 1) {
    await Promise.resolve();
  }
}

/** Moves the scroller as a reader would and waits for the `scroll` event. */
export async function userScrollTo(scroller: HTMLElement, top: number) {
  scroller.scrollTop = top;
  await flushScrollEvents();
}

export function distanceFromBottom(scroller: HTMLElement) {
  return scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop;
}

/** Viewport-relative top of `el`, in the fake layout. */
export function viewportTop(el: Element) {
  return el.getBoundingClientRect().top;
}

function overrideGetter<T>(
  target: object,
  key: string,
  get: (this: Element) => T,
  set?: (this: Element, value: T) => void,
): Restore {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, get, set });
  return () => {
    if (original) {
      Object.defineProperty(target, key, original);
    } else {
      delete (target as Record<string, unknown>)[key];
    }
  };
}

export function installFakeScrollLayout(): Restore {
  const restores: Restore[] = [
    overrideGetter(Element.prototype, 'scrollHeight', function () {
      return isScroller(this)
        ? Math.max(contentHeight(this), fakeClientHeight(this))
        : fakeHeight(this);
    }),
    overrideGetter(Element.prototype, 'clientHeight', function () {
      return isScroller(this) ? fakeClientHeight(this) : fakeHeight(this);
    }),
    overrideGetter(HTMLElement.prototype, 'offsetHeight', function () {
      return fakeHeight(this);
    }),
    overrideGetter(
      Element.prototype,
      'scrollTop',
      function () {
        return getScrollTop(this);
      },
      function (value: number) {
        setScrollTop(this, value);
      },
    ),
  ];

  const originalRect = Element.prototype.getBoundingClientRect;
  const originalClientRects = Element.prototype.getClientRects;
  const originalScrollTo = Element.prototype.scrollTo;
  Element.prototype.getBoundingClientRect = function () {
    return fakeRect(this);
  };
  Element.prototype.getClientRects = function () {
    return (isHidden(this) ? [] : [fakeRect(this)]) as unknown as DOMRectList;
  };
  Element.prototype.scrollTo = function (
    this: Element,
    options?: ScrollToOptions | number,
  ) {
    if (typeof options === 'object' && typeof options.top === 'number') {
      setScrollTop(this, options.top);
    }
  } as Element['scrollTo'];

  const originalResizeObserver = window.ResizeObserver;
  window.ResizeObserver =
    FakeResizeObserver as unknown as typeof ResizeObserver;

  return () => {
    for (const restore of restores) restore();
    Element.prototype.getBoundingClientRect = originalRect;
    Element.prototype.getClientRects = originalClientRects;
    Element.prototype.scrollTo = originalScrollTo;
    window.ResizeObserver = originalResizeObserver;
    resizeObservers.clear();
  };
}
