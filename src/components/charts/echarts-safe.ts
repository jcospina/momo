import type { EChartsOption } from 'echarts';
import type { EChartsType } from './echarts-init';

export function safeResize(
  chart: EChartsType,
  entry?: ResizeObserverEntry,
  context = 'ECharts',
) {
  if (chart.isDisposed()) return;
  if (
    entry &&
    (entry.contentRect.width === 0 || entry.contentRect.height === 0)
  ) {
    return;
  }
  try {
    chart.resize();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`${context} resize skipped:`, error);
    }
  }
}

export function safeSetOption(
  chart: EChartsType,
  option: EChartsOption,
  context = 'ECharts',
  notMerge = false,
) {
  if (chart.isDisposed()) return;
  try {
    chart.setOption(option, { notMerge });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`${context} setOption skipped:`, error);
    }
  }
}
