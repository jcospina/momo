import { act, renderHook } from '@testing-library/react';

import { useMonthlyWindows } from './use-monthly-windows';

describe('useMonthlyWindows', () => {
  it('initializes to the last window', () => {
    const months = Array.from({ length: 12 }, (_, index) => `2024-${index}`);
    const { result } = renderHook(() =>
      useMonthlyWindows(months, { defaultRange: '6' }),
    );

    expect(result.current.windows).toHaveLength(2);
    expect(result.current.activeIndex).toBe(1);
  });

  it('resets to the last window when range changes', () => {
    const months = Array.from({ length: 12 }, (_, index) => `2024-${index}`);
    const { result } = renderHook(() =>
      useMonthlyWindows(months, { defaultRange: '6' }),
    );

    act(() => {
      result.current.setSelectedRange('3');
    });

    expect(result.current.windows).toHaveLength(4);
    expect(result.current.activeIndex).toBe(3);
  });

  it('clamps activeIndex to window bounds', () => {
    const months = Array.from({ length: 5 }, (_, index) => `2024-${index}`);
    const { result } = renderHook(() =>
      useMonthlyWindows(months, { defaultRange: '2' }),
    );

    act(() => {
      result.current.setActiveIndex(99);
    });

    expect(result.current.activeIndex).toBe(2);
  });
});
