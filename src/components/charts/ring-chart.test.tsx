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
import { RingChart } from './ring-chart';

const mockInit = jest.mocked(echarts.init);
const mockSafeSetOption = jest.mocked(safeSetOption);

type PieSeriesOption = {
  type?: string;
  itemStyle?: {
    borderWidth?: number;
    borderColor?: string;
  };
};

type ChartOptions = {
  series?: PieSeriesOption[];
};

function getLastAppliedOptions(): ChartOptions {
  const latestCall = mockSafeSetOption.mock.calls.at(-1);
  expect(latestCall).toBeDefined();
  return (latestCall?.[1] as ChartOptions) ?? {};
}

describe('RingChart', () => {
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

  it('applies a bold border to pie segments', async () => {
    render(
      <RingChart
        items={[
          { name: 'Food', value: 100_000 },
          { name: 'Transport', value: 70_000 },
        ]}
        currency="USD"
      />,
    );

    await waitFor(() => {
      expect(mockSafeSetOption).toHaveBeenCalled();
    });

    const options = getLastAppliedOptions();
    const firstSeries = options.series?.[0];

    expect(firstSeries?.type).toBe('pie');
    expect(firstSeries?.itemStyle?.borderWidth).toBe(2);
    expect(firstSeries?.itemStyle?.borderColor).toBe('rgb(2, 0, 32)');
  });
});
