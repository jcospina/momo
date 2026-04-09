import { render, waitFor } from '@testing-library/react';
import { DailyComparisonLineChart } from './daily-comparison-line-chart';
import { type EChartsType, echarts } from './echarts-init';

jest.mock('./echarts-init', () => ({
  echarts: {
    init: jest.fn(),
  },
}));

const mockInit = jest.mocked(echarts.init);

type LineSeriesOption = {
  type?: string;
  showSymbol?: boolean;
  markPoint?: {
    data?: Array<{
      xAxis?: number;
      yAxis?: number;
    }>;
    symbol?: string;
    symbolSize?: number;
    silent?: boolean;
    tooltip?: {
      show?: boolean;
    };
    label?: {
      show?: boolean;
    };
    emphasis?: {
      disabled?: boolean;
    };
  };
};

type ChartOptions = {
  tooltip?: {
    trigger?: string;
  };
  series?: LineSeriesOption[];
};

function getLastAppliedOptions(setOption: jest.Mock): ChartOptions | undefined {
  const latestCall = setOption.mock.calls.at(-1);
  return latestCall?.[0] as ChartOptions | undefined;
}

describe('DailyComparisonLineChart', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.setSystemTime(new Date('2026-03-09T12:00:00Z'));

    Object.defineProperty(window, 'ResizeObserver', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows persistent markers on the current day for both lines without changing hover config', async () => {
    const setOption = jest.fn();
    mockInit.mockReturnValue({
      setOption,
      resize: jest.fn(),
      dispose: jest.fn(),
    } as unknown as EChartsType);

    render(
      <DailyComparisonLineChart
        monthLabel="Mar 2026"
        current={[
          { day: 1, totalCents: 100 },
          { day: 9, totalCents: 900 },
          { day: 12, totalCents: 1_200 },
        ]}
        previous={[
          { day: 1, totalCents: 50 },
          { day: 8, totalCents: 800 },
          { day: 12, totalCents: 1_100 },
        ]}
        currency="USD"
      />,
    );

    await waitFor(() => {
      expect(setOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions(setOption);
    const lineSeries = (options?.series ?? []).filter(
      series => series.type === 'line',
    );

    expect(options?.tooltip?.trigger).toBe('axis');
    expect(lineSeries).toHaveLength(2);

    lineSeries.forEach(series => {
      expect(series.showSymbol).toBe(false);
      expect(series.markPoint?.symbol).toBe('emptyCircle');
      expect(series.markPoint?.symbolSize).toBe(8);
      expect(series.markPoint?.silent).toBe(true);
      expect(series.markPoint?.tooltip?.show).toBe(false);
      expect(series.markPoint?.label?.show).toBe(false);
      expect(series.markPoint?.emphasis?.disabled).toBe(true);
      expect(series.markPoint?.data).toHaveLength(1);
    });

    expect(lineSeries[0]?.markPoint?.data?.[0]).toMatchObject({
      xAxis: 8,
      yAxis: 900,
    });
    expect(lineSeries[1]?.markPoint?.data?.[0]).toMatchObject({
      xAxis: 8,
      yAxis: 800,
    });
  });

  it('renders persistent markers using today day-index regardless of month label', async () => {
    const setOption = jest.fn();
    mockInit.mockReturnValue({
      setOption,
      resize: jest.fn(),
      dispose: jest.fn(),
    } as unknown as EChartsType);

    render(
      <DailyComparisonLineChart
        monthLabel="Jan 1999"
        current={[
          { day: 1, totalCents: 100 },
          { day: 9, totalCents: 900 },
        ]}
        previous={[
          { day: 1, totalCents: 50 },
          { day: 9, totalCents: 600 },
        ]}
        currency="USD"
      />,
    );

    await waitFor(() => {
      expect(setOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions(setOption);
    const lineSeries = (options?.series ?? []).filter(
      series => series.type === 'line',
    );

    lineSeries.forEach(series => {
      expect(series.markPoint?.data).toHaveLength(1);
    });
    expect(lineSeries[0]?.markPoint?.data?.[0]).toMatchObject({
      xAxis: 8,
      yAxis: 900,
    });
    expect(lineSeries[1]?.markPoint?.data?.[0]).toMatchObject({
      xAxis: 8,
      yAxis: 600,
    });
  });
});
