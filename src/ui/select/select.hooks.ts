import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from 'react';

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type DropdownPositionOptions = {
  gap?: number;
};

/**
 * Tracks viewport-aware positioning for a dropdown attached to a trigger.
 *
 * Calculates `top`, `left`, and `width` based on the trigger's bounding
 * rect, clamped to the visible viewport. Call `attachPositionListeners`
 * on open to start tracking resize/scroll, and invoke the returned cleanup
 * on close.
 */
export function useDropdownPosition(options?: DropdownPositionOptions) {
  const gap = options?.gap ?? 6;
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
  });

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = dropdownRef.current?.offsetHeight ?? 0;
    const viewportHeight = window.innerHeight;
    const desiredLeft = rect.left + window.scrollX;
    const viewportWidth = window.innerWidth;
    const clampedLeft = Math.max(
      0,
      Math.min(desiredLeft, viewportWidth - rect.width),
    );
    const desiredTop = rect.bottom + window.scrollY + gap;
    const maxTop = viewportHeight
      ? window.scrollY + viewportHeight - dropdownHeight - gap
      : desiredTop;
    const clampedTop = Math.max(window.scrollY, Math.min(desiredTop, maxTop));
    setDropdownPosition({
      top: clampedTop,
      left: clampedLeft,
      width: rect.width,
    });
  }, [gap]);

  const attachPositionListeners = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) return;
      updateDropdownPosition();
      requestAnimationFrame(updateDropdownPosition);
      const handle = () => updateDropdownPosition();
      window.addEventListener('resize', handle);
      window.addEventListener('scroll', handle, true);
      return () => {
        window.removeEventListener('resize', handle);
        window.removeEventListener('scroll', handle, true);
      };
    },
    [updateDropdownPosition],
  );

  return {
    triggerRef,
    dropdownRef,
    dropdownPosition,
    attachPositionListeners,
  };
}

/**
 * Keeps the keyboard-active option scrolled into view within a list container.
 *
 * Attach `listRef` to the scrollable `<ul>` and `activeOptionRef` to the
 * currently highlighted `<li>`. Call `ensureVisible(isOpen, activeIndex)`
 * after each navigation to smooth-scroll the active item into view.
 */
export function useActiveOptionScroll() {
  const listRef = useRef<HTMLUListElement | null>(null);
  const activeOptionRef = useRef<HTMLLIElement | null>(null);

  const ensureVisible = useCallback((isOpen: boolean, activeIndex: number) => {
    if (!isOpen || activeIndex < 0) return;
    const listEl = listRef.current;
    const activeEl = activeOptionRef.current;
    if (listEl && activeEl) {
      const listRect = listEl.getBoundingClientRect();
      const optionRect = activeEl.getBoundingClientRect();
      const offsetTop = optionRect.top - listRect.top + listEl.scrollTop;
      const offsetBottom = offsetTop + optionRect.height;
      if (offsetTop < listEl.scrollTop) {
        listEl.scrollTo({ top: offsetTop, behavior: 'smooth' });
      } else if (offsetBottom > listEl.scrollTop + listRect.height) {
        listEl.scrollTo({
          top: offsetBottom - listRect.height,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  return { listRef, activeOptionRef, ensureVisible };
}

type NavigationArgs<T> = {
  disabled: boolean;
  isOpen: boolean;
  selectedIndex: number;
  options: T[];
  isOptionDisabled: (option: T) => boolean;
  firstEnabledIndex: () => number;
  findNextEnabled: (start: number, direction: 1 | -1) => number;
  openAtIndex: (index: number) => void;
  selectOption: (option: T | null) => void;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
  onRequestClose: () => void;
};

/**
 * Full keyboard navigation for a listbox-style dropdown.
 *
 * Handles `ArrowUp/Down`, `Home/End`, `Enter/Space` (select), `Escape`
 * (close), and `Tab` (close). Skips disabled options using the provided
 * `isOptionDisabled` predicate.
 *
 * Returns a `handleKeyDown` handler to spread onto the trigger element.
 */
export function useKeyboardNavigation<T>({
  disabled,
  isOpen,
  selectedIndex,
  options,
  isOptionDisabled,
  firstEnabledIndex,
  findNextEnabled,
  openAtIndex,
  selectOption,
  activeIndex,
  setActiveIndex,
  onRequestClose,
}: NavigationArgs<T>) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const { key } = event;

      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) {
          const startIndex =
            selectedIndex >= 0 && !isOptionDisabled(options[selectedIndex])
              ? selectedIndex
              : firstEnabledIndex();
          openAtIndex(startIndex);
          return;
        }
        setActiveIndex(prev =>
          key === 'ArrowDown'
            ? findNextEnabled(prev, 1)
            : prev === -1
              ? findNextEnabled(options.length, -1)
              : findNextEnabled(prev, -1),
        );
        return;
      }

      if (key === 'Home' || key === 'End') {
        if (!isOpen) {
          return;
        }
        event.preventDefault();
        setActiveIndex(
          key === 'Home'
            ? firstEnabledIndex()
            : findNextEnabled(options.length, -1),
        );
        return;
      }

      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        if (!isOpen) {
          const startIndex =
            selectedIndex >= 0 && !isOptionDisabled(options[selectedIndex])
              ? selectedIndex
              : firstEnabledIndex();
          openAtIndex(startIndex);
          return;
        }
        if (activeIndex >= 0 && !isOptionDisabled(options[activeIndex])) {
          selectOption(options[activeIndex]);
        }
        return;
      }

      if (key === 'Escape') {
        if (isOpen) {
          event.preventDefault();
          onRequestClose();
        }
        return;
      }

      if (key === 'Tab') {
        onRequestClose();
        return;
      }
    },
    [
      activeIndex,
      disabled,
      firstEnabledIndex,
      findNextEnabled,
      isOpen,
      isOptionDisabled,
      openAtIndex,
      options,
      selectOption,
      selectedIndex,
      setActiveIndex,
      onRequestClose,
    ],
  );

  return { handleKeyDown };
}
