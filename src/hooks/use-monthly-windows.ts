import { buildMonthlyWindows } from '@helpers/expenses/expense-stats.months';
import { useCallback, useMemo, useState } from 'react';

type UseMonthlyWindowsOptions = {
  defaultRange: string;
  maxRange?: number;
};

function clampRange(range: string, maxRange: number) {
  return Math.max(1, Math.min(maxRange, Number(range) || 1));
}

export function useMonthlyWindows<T>(
  items: T[],
  { defaultRange, maxRange = 12 }: UseMonthlyWindowsOptions,
) {
  const [selectedRange, setSelectedRangeState] = useState(defaultRange);

  const rangeValue = useMemo(
    () => clampRange(selectedRange, maxRange),
    [selectedRange, maxRange],
  );

  const windows = useMemo(
    () => buildMonthlyWindows(items, rangeValue),
    [items, rangeValue],
  );

  const [activeIndexState, setActiveIndexState] = useState(() =>
    Math.max(windows.length - 1, 0),
  );

  const activeIndex = Math.min(
    activeIndexState,
    Math.max(windows.length - 1, 0),
  );

  const setSelectedRange = useCallback(
    (nextRange: string) => {
      const nextValue = clampRange(nextRange, maxRange);
      const nextWindows = buildMonthlyWindows(items, nextValue);
      const lastIndex = Math.max(nextWindows.length - 1, 0);
      setSelectedRangeState(nextRange);
      setActiveIndexState(lastIndex);
    },
    [items, maxRange],
  );

  const setActiveIndex = useCallback(
    (index: number) => {
      const lastIndex = Math.max(windows.length - 1, 0);
      const nextIndex = Math.min(Math.max(index, 0), lastIndex);
      setActiveIndexState(nextIndex);
    },
    [windows.length],
  );

  return {
    selectedRange,
    setSelectedRange,
    windows,
    activeIndex,
    setActiveIndex,
    rangeValue,
  };
}
