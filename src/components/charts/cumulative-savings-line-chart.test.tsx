import { render, waitFor } from '@testing-library/react';
import type { CumulativeSavingsPoint } from '@/lib/data/stats/types';

jest.mock('./echarts-init', () => ({
  echarts: {
    init: jest.fn(),
  },
}));

jest.mock('./echarts-safe', () => ({
  safeResize: jest.fn(),
  safeSetOption: jest.fn(),
}));

import { CumulativeSavingsLineChart } from './cumulative-savings-line-chart';
import { type EChartsType, echarts } from './echarts-init';
import { safeSetOption } from './echarts-safe';

const mockInit = jest.mocked(echarts.init);
const mockSafeSetOption = jest.mocked(safeSetOption);

type AxisOption = {
  min?: number;
  max?: number;
  boundaryGap?: boolean;
};

type SeriesOption = {
  type?: string;
  data?: number[];
  lineStyle?: {
    width?: number;
  };
  itemStyle?: {
    borderWidth?: number;
    borderColor?: string;
  };
};

type ChartOptions = {
  xAxis?: AxisOption | AxisOption[];
  yAxis?: AxisOption | AxisOption[];
  series?: SeriesOption[];
};

function getPrimaryAxis(
  axis: AxisOption | AxisOption[] | undefined,
): AxisOption | undefined {
  if (!axis) return undefined;
  return Array.isArray(axis) ? axis[0] : axis;
}

function getLastAppliedOptions(): ChartOptions {
  const latestCall = mockSafeSetOption.mock.calls.at(-1);
  expect(latestCall).toBeDefined();
  return (latestCall?.[1] as ChartOptions) ?? {};
}

function renderChart(months: CumulativeSavingsPoint[]) {
  render(<CumulativeSavingsLineChart months={months} currency="USD" />);
}

describe('CumulativeSavingsLineChart', () => {
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

  it('renders negative-only cumulative values with a zero-inclusive y-axis', async () => {
    renderChart([
      { month: '2026-01', netCents: -150_000, cumulativeCents: -150_000 },
      { month: '2026-02', netCents: -100_000, cumulativeCents: -250_000 },
    ]);

    await waitFor(() => {
      expect(mockSafeSetOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions();
    const yAxis = getPrimaryAxis(options.yAxis);
    const xAxis = getPrimaryAxis(options.xAxis);
    const firstSeries = options.series?.[0];

    expect(yAxis?.min).toBeLessThan(0);
    expect(yAxis?.max).toBeGreaterThan(0);
    expect(xAxis?.boundaryGap).toBe(false);
    expect(firstSeries?.type).toBe('line');
  });

  it('keeps zero within y-axis range when cumulative values cross zero', async () => {
    renderChart([
      { month: '2026-01', netCents: -50_000, cumulativeCents: -50_000 },
      { month: '2026-02', netCents: 80_000, cumulativeCents: 30_000 },
    ]);

    await waitFor(() => {
      expect(mockSafeSetOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions();
    const yAxis = getPrimaryAxis(options.yAxis);

    expect(yAxis?.min).toBeLessThan(0);
    expect(yAxis?.max).toBeGreaterThan(0);
  });

  it('renders a single-month window with the same line chart style', async () => {
    renderChart([
      { month: '2026-01', netCents: -75_000, cumulativeCents: -75_000 },
    ]);

    await waitFor(() => {
      expect(mockSafeSetOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions();
    const xAxis = getPrimaryAxis(options.xAxis);
    const firstSeries = options.series?.[0];

    expect(xAxis?.boundaryGap).toBe(false);
    expect(firstSeries?.type).toBe('line');
    expect(firstSeries?.data).toEqual([-75_000, -75_000]);
    expect(firstSeries?.lineStyle?.width).toBe(3);
    expect(firstSeries?.itemStyle?.borderWidth).toBe(2);
    expect(firstSeries?.itemStyle?.borderColor).toBe('rgb(2, 0, 32)');
  });
});
