import { render, waitFor } from '@testing-library/react';
import type { MonthlyCashflowPoint } from '@/lib/data/stats/types';

jest.mock('./echarts-init', () => ({
  echarts: {
    init: jest.fn(),
  },
}));

jest.mock('./echarts-safe', () => ({
  safeResize: jest.fn(),
  safeSetOption: jest.fn(),
}));

import { type EChartsType, echarts } from './echarts-init';
import { safeSetOption } from './echarts-safe';
import { MonthlyIncomeVsExpenseBarChart } from './monthly-income-vs-expense-bar-chart';

const mockInit = jest.mocked(echarts.init);
const mockSafeSetOption = jest.mocked(safeSetOption);

type BarSeriesOption = {
  name?: string;
  type?: string;
  barGap?: string;
  barCategoryGap?: string;
  itemStyle?: {
    borderWidth?: number;
    borderColor?: string;
  };
  tooltip?: {
    show?: boolean;
  };
  renderItem?: (_params: unknown, api: unknown) => unknown;
};

type AxisOption = {
  axisLine?: {
    lineStyle?: {
      color?: string;
      width?: number;
    };
  };
};

type ChartOptions = {
  series?: BarSeriesOption[];
  xAxis?: AxisOption | AxisOption[];
  yAxis?: AxisOption | AxisOption[];
};

function renderChart(months: MonthlyCashflowPoint[]) {
  render(<MonthlyIncomeVsExpenseBarChart months={months} currency="USD" />);
}

function getLastAppliedOptions(): ChartOptions {
  const latestCall = mockSafeSetOption.mock.calls.at(-1);
  expect(latestCall).toBeDefined();
  return (latestCall?.[1] as ChartOptions) ?? {};
}

describe('MonthlyIncomeVsExpenseBarChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInit.mockReturnValue({
      dispose: jest.fn(),
    } as unknown as EChartsType);

    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
      })),
    });
  });

  it('applies neobrutalist bar borders on both series', async () => {
    renderChart([
      {
        month: '2026-01',
        incomeCents: 400_000,
        expenseCents: 250_000,
        netCents: 150_000,
      },
      {
        month: '2026-02',
        incomeCents: 450_000,
        expenseCents: 300_000,
        netCents: 150_000,
      },
    ]);

    await waitFor(() => {
      expect(mockSafeSetOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions();
    const series = options.series ?? [];
    const xAxis = Array.isArray(options.xAxis)
      ? options.xAxis[0]
      : options.xAxis;
    const yAxis = Array.isArray(options.yAxis)
      ? options.yAxis[0]
      : options.yAxis;

    const filledBarSeries = series.filter(entry => entry.type === 'bar');
    const outlineSeries = series.filter(entry => entry.type === 'custom');

    expect(filledBarSeries).toHaveLength(2);
    filledBarSeries.forEach(entry => {
      expect(entry.type).toBe('bar');
      expect(entry.barGap).toBe('30%');
      expect(entry.barCategoryGap).toBe('20%');
      expect(entry.itemStyle?.borderWidth).toBe(0);
    });
    expect(outlineSeries).toHaveLength(2);
    expect(outlineSeries.map(entry => entry.name)).toEqual([
      '__income_outline__',
      '__expenses_outline__',
    ]);
    outlineSeries.forEach(entry => {
      expect(entry.tooltip?.show).toBe(false);
    });
    expect(xAxis?.axisLine?.lineStyle).toMatchObject({
      color: 'rgb(2, 0, 32)',
      width: 2,
    });
    expect(yAxis?.axisLine?.lineStyle).toMatchObject({
      color: 'rgb(2, 0, 32)',
      width: 2,
    });
  });

  it('builds outline geometry from bar layout slot centers for perfect edge alignment', async () => {
    renderChart([
      {
        month: '2026-01',
        incomeCents: 300_000,
        expenseCents: 200_000,
        netCents: 100_000,
      },
    ]);

    await waitFor(() => {
      expect(mockSafeSetOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions();
    const outlineSeries = (options.series ?? []).filter(
      entry => entry.type === 'custom',
    );
    const incomeOutline = outlineSeries.find(
      entry => entry.name === '__income_outline__',
    );
    expect(incomeOutline?.renderItem).toBeDefined();

    const renderResult = incomeOutline?.renderItem?.(
      {},
      {
        value: (dim: number) => (dim === 0 ? 0 : 300_000),
        coord: (point: [number, number]) =>
          point[1] === 0 ? [100.3, 220.6] : [100.3, 120.2],
        size: () => [80, 0],
        barLayout: () => [
          { width: 28, offset: -999, offsetCenter: -14, bandWidth: 80 },
          { width: 28, offset: 999, offsetCenter: 14, bandWidth: 80 },
        ],
        getDevicePixelRatio: () => 1,
      },
    ) as
      | {
          type?: string;
          shape?: { points?: number[][] };
        }
      | undefined;

    expect(renderResult?.type).toBe('polyline');
    expect(renderResult?.shape?.points).toEqual([
      [72, 221],
      [72, 120],
      [100, 120],
      [100, 221],
    ]);
  });
});
