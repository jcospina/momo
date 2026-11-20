/**
 * Keeps a chat scroller pinned to its newest content while the reader is at
 * the bottom, and keeps their place when they scroll up to read history.
 *
 * Ported from `createStickToBottom` in vercel-labs/ui (`@ui-sdk/core`
 * 0.1.0-beta.13, src/foundation/lists/stick-to-bottom.ts).
 * Copyright 2026 Vercel, Inc. Licensed under the Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Changes from upstream: rewritten in TypeScript with descriptive names and
 * comments. The behaviour is unchanged.
 *
 * How it works:
 * - `connect()` turns the browser's own scroll anchoring off on the scroller
 *   (`overflow-anchor: none`). Leaving it on makes the browser and this helper
 *   both correct the scroll position, so content jumps by the size of the
 *   change.
 * - A ResizeObserver on the scroller's content and a MutationObserver on the
 *   row container call `onContentResized()` after layout, before paint.
 * - While following, content growth snaps to the end.
 * - While the reader is scrolled up, the first visible row is remembered
 *   ("pinned"); when anything above it changes size (older messages
 *   prepended, a row growing), the scroll position moves by the same amount
 *   so the pinned row stays where the reader sees it.
 */

export type StickToBottomState = {
  /** Whether new content scrolls into view. */
  following: boolean;
  /** Whether the end is in view now. */
  atBottom: boolean;
  /** Whether content arrived below while not following. Clears at the bottom. */
  unseen: boolean;
};

export type StickToBottomOptions = {
  /** How close to the end, in pixels, still counts as at the bottom. Defaults to 24. */
  threshold?: number;
  /** Whether it follows from the start. Defaults to true. */
  initial?: boolean;
  /** Runs when `get()` changes. */
  onChange?: (state: StickToBottomState) => void;
};

type PinnedRow = {
  row: Element;
  /** The row's offset from the top of the scrollable content. */
  contentTop: number;
};

const DEFAULT_THRESHOLD_PX = 24;
const SCROLL_UP_KEYS = ['ArrowUp', 'PageUp', 'Home'];

function distanceFromBottom(el: HTMLElement) {
  return el.scrollHeight - el.clientHeight - el.scrollTop;
}

/**
 * The element whose children are the list rows. Walks down through wrappers
 * that have a single child (for example `scroller > inner > rows`).
 */
function findRowContainer(scroller: Element) {
  let parent = scroller;
  while (
    parent.children.length === 1 &&
    parent.children[0].children.length > 0
  ) {
    parent = parent.children[0];
  }
  return parent;
}

/**
 * Whether a wheel, key or touch event means the reader is heading up. Touch
 * moves always count; the scroll event that follows tells the direction.
 * Checks `event.type` rather than `instanceof` so events from another window
 * (an iframe) are recognised too.
 */
function isScrollUpIntent(event: Event) {
  if (event.type === 'wheel') return (event as WheelEvent).deltaY < 0;
  if (event.type === 'keydown') {
    return SCROLL_UP_KEYS.includes((event as KeyboardEvent).key);
  }
  return true;
}

function contentOffsetOf(scroller: HTMLElement, row: Element) {
  return (
    row.getBoundingClientRect().top -
    scroller.getBoundingClientRect().top +
    scroller.scrollTop
  );
}

/** First row (in DOM order) whose bottom edge is below the scroller's top. */
function findFirstVisibleRow(scroller: HTMLElement): PinnedRow | undefined {
  const rows = findRowContainer(scroller).children;
  const box = scroller.getBoundingClientRect();
  let found: { row: Element; rect: DOMRect } | undefined;
  let low = 0;
  let high = rows.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    // Skip rows that are not rendered (for example `display: none`).
    let probe = middle;
    while (probe <= high && rows[probe].getClientRects().length === 0) {
      probe++;
    }
    if (probe > high) {
      high = middle - 1;
      continue;
    }
    const rect = rows[probe].getBoundingClientRect();
    if (rect.bottom <= box.top) {
      low = probe + 1;
    } else {
      found = { row: rows[probe], rect };
      high = middle - 1;
    }
  }

  if (!found || found.rect.top >= box.bottom) return undefined;
  return {
    row: found.row,
    contentTop: found.rect.top - box.top + scroller.scrollTop,
  };
}

export function createStickToBottom(options: StickToBottomOptions = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD_PX;
  let state: StickToBottomState = {
    following: options.initial ?? true,
    atBottom: true,
    unseen: false,
  };
  const listeners = new Set<() => void>();

  let scroller: HTMLElement | undefined;
  /** The scrollTop this helper last wrote, so its own scroll events are not read as the reader's. */
  let programmaticScrollTop: number | null = null;
  let lastScrollTop = 0;
  let lastScrollHeight = 0;
  /** Distance from the bottom saved by `prepend()`, restored on the next growth. */
  let prependBottomDistance: number | null = null;
  let pinnedRow: PinnedRow | undefined;

  function setState(next: Partial<StickToBottomState>) {
    const merged = { ...state, ...next };
    if (merged.atBottom) {
      merged.unseen = false;
    }
    if (
      merged.following === state.following &&
      merged.atBottom === state.atBottom &&
      merged.unseen === state.unseen
    ) {
      return;
    }
    state = merged;
    options.onChange?.(state);
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function pinFirstVisibleRow(el: HTMLElement) {
    pinnedRow = state.following ? undefined : findFirstVisibleRow(el);
  }

  function scrollToEnd(el: HTMLElement, behavior?: ScrollBehavior) {
    const top = el.scrollHeight - el.clientHeight;
    programmaticScrollTop = Math.max(0, Math.round(top));
    if (behavior === 'smooth') {
      el.scrollTo({ top, behavior });
    } else {
      el.scrollTop = top;
    }
  }

  function onContentResized() {
    const el = scroller;
    if (!el) return;

    let unseen = false;
    if (
      prependBottomDistance !== null &&
      el.scrollHeight !== lastScrollHeight
    ) {
      programmaticScrollTop = Math.round(
        el.scrollHeight - el.clientHeight - prependBottomDistance,
      );
      el.scrollTop = programmaticScrollTop;
      prependBottomDistance = null;
    } else if (state.following) {
      scrollToEnd(el);
    } else {
      const pinnedMovedBy =
        pinnedRow && el.contains(pinnedRow.row)
          ? contentOffsetOf(el, pinnedRow.row) - pinnedRow.contentTop
          : 0;
      if (Math.abs(pinnedMovedBy) >= 1) {
        // Content shrinking at the end can clamp scrollTop before we get
        // here; start from where the reader was instead.
        const wasClamped =
          el.scrollTop < lastScrollTop && distanceFromBottom(el) < 1;
        const startTop = wasClamped ? lastScrollTop : el.scrollTop;
        programmaticScrollTop = Math.round(startTop + pinnedMovedBy);
        el.scrollTop = programmaticScrollTop;
      }
      unseen = el.scrollHeight - pinnedMovedBy > lastScrollHeight;
    }

    lastScrollHeight = el.scrollHeight;
    lastScrollTop = el.scrollTop;
    pinFirstVisibleRow(el);
    const atBottom = distanceFromBottom(el) <= threshold;
    setState(unseen ? { atBottom, unseen } : { atBottom });
  }

  function onScroll() {
    const el = scroller;
    if (!el) return;

    const top = el.scrollTop;
    const atBottom = distanceFromBottom(el) <= threshold;
    const isOwnScroll =
      programmaticScrollTop !== null &&
      Math.abs(top - programmaticScrollTop) <= 1;

    if (isOwnScroll) {
      if (atBottom) {
        programmaticScrollTop = null;
      }
    } else if (top < lastScrollTop - 1 && !atBottom) {
      setState({ following: false });
    } else if (atBottom) {
      setState({ following: true });
    }

    lastScrollTop = top;
    setState({ atBottom });
    pinFirstVisibleRow(el);
  }

  return {
    /** Where the log stands now. Same object until something changes. */
    get: () => state,

    /** Calls `listener` whenever `get()` changes, until the returned function runs. */
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /**
     * Follows `el`'s end, watching its children's size, until the returned
     * function runs. Turns the browser's own scroll anchoring off on it,
     * which would fight the following.
     */
    connect(el: HTMLElement) {
      scroller = el;
      el.style.setProperty('overflow-anchor', 'none');
      const view = el.ownerDocument.defaultView;

      const sizeObserver = view?.ResizeObserver
        ? new view.ResizeObserver(onContentResized)
        : undefined;
      const observeSizes = () => {
        sizeObserver?.disconnect();
        sizeObserver?.observe(el);
        for (const child of el.children) {
          sizeObserver?.observe(child);
        }
      };

      const rowObserver = view?.MutationObserver
        ? new view.MutationObserver(() => {
            observeSizes();
            observeRowContainers();
            onContentResized();
          })
        : undefined;
      const observeRowContainers = () => {
        rowObserver?.disconnect();
        for (let parent: Element = el; ; parent = parent.children[0]) {
          rowObserver?.observe(parent, { childList: true });
          if (parent.children.length !== 1) break;
        }
      };

      // Stop following the moment the reader starts scrolling up, before the
      // scroll event itself arrives.
      const onScrollIntent = (event: Event) => {
        if (isScrollUpIntent(event) && el.scrollHeight > el.clientHeight) {
          programmaticScrollTop = null;
          if (event.type !== 'touchmove') {
            setState({ following: false });
          }
        }
      };

      observeSizes();
      observeRowContainers();
      el.addEventListener('scroll', onScroll, { passive: true });
      el.addEventListener('wheel', onScrollIntent, { passive: true });
      el.addEventListener('touchmove', onScrollIntent, { passive: true });
      el.addEventListener('keydown', onScrollIntent);

      lastScrollHeight = el.scrollHeight;
      if (state.following) {
        scrollToEnd(el);
      }
      lastScrollTop = el.scrollTop;

      return () => {
        sizeObserver?.disconnect();
        rowObserver?.disconnect();
        el.removeEventListener('scroll', onScroll);
        el.removeEventListener('wheel', onScrollIntent);
        el.removeEventListener('touchmove', onScrollIntent);
        el.removeEventListener('keydown', onScrollIntent);
        if (scroller === el) {
          scroller = undefined;
          pinnedRow = undefined;
        }
      };
    },

    /** Scrolls to the end and follows again. */
    scrollToBottom({ behavior }: { behavior?: ScrollBehavior } = {}) {
      setState({ following: true });
      if (scroller) {
        scrollToEnd(scroller, behavior);
      }
    },

    /** Stops following, as if the reader scrolled up. */
    release() {
      setState({ following: false });
      if (scroller) {
        pinFirstVisibleRow(scroller);
      }
    },

    /**
     * Call right before adding content above, like older messages: the next
     * growth keeps what's in view where it is instead of pushing it down.
     */
    prepend() {
      if (scroller) {
        prependBottomDistance = distanceFromBottom(scroller);
      }
    },
  };
}

export type StickToBottom = ReturnType<typeof createStickToBottom>;
