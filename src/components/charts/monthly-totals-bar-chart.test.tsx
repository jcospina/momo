import { render, waitFor } from '@testing-library/react';

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
import { MonthlyTotalsBarChart } from './monthly-totals-bar-chart';

const mockInit = jest.mocked(echarts.init);
const mockSafeSetOption = jest.mocked(safeSetOption);

type SeriesOption = {
  name?: string;
  type?: string;
  tooltip?: {
    show?: boolean;
  };
  itemStyle?: {
    borderWidth?: number;
  };
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
  series?: SeriesOption[];
  xAxis?: AxisOption | AxisOption[];
  yAxis?: AxisOption | AxisOption[];
  legend?: {
    itemStyle?: {
      borderColor?: string;
      borderWidth?: number;
    };
  };
};

function getLastAppliedOptions(): ChartOptions {
  const latestCall = mockSafeSetOption.mock.calls.at(-1);
  expect(latestCall).toBeDefined();
  return (latestCall?.[1] as ChartOptions) ?? {};
}

describe('MonthlyTotalsBarChart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInit.mockReturnValue({
      dispose: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
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

  it('keeps inner stacked segments borderless and draws a single outer outline', async () => {
    render(
      <MonthlyTotalsBarChart
        months={[
          {
            month: '2026-01',
            categories: [
              { category: 'Food', totalCents: 50_000 },
              { category: 'Rent', totalCents: 180_000 },
            ],
          },
          {
            month: '2026-02',
            categories: [
              { category: 'Food', totalCents: 55_000 },
              { category: 'Rent', totalCents: 190_000 },
            ],
          },
        ]}
        currency="USD"
      />,
    );

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
    const outlineSeries = series.find(
      entry => entry.name === '__stack_outline__',
    );
    const stackedSeries = series.filter(
      entry => entry.type === 'bar' && entry.name !== '__stack_outline__',
    );

    expect(stackedSeries.length).toBeGreaterThan(0);
    stackedSeries.forEach(entry => {
      expect(entry.itemStyle?.borderWidth).toBe(0);
    });

    expect(outlineSeries).toMatchObject({
      type: 'custom',
      tooltip: { show: false },
    });
    expect(xAxis?.axisLine?.lineStyle).toMatchObject({
      color: 'rgb(2, 0, 32)',
      width: 2,
    });
    expect(yAxis?.axisLine?.lineStyle).toMatchObject({
      color: 'rgb(2, 0, 32)',
      width: 2,
    });
    expect(options.legend?.itemStyle).toMatchObject({
      borderColor: 'rgb(2, 0, 32)',
      borderWidth: 2,
    });
  });
});
