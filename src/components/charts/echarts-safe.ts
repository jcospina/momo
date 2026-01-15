import type { EChartsOption, EChartsType } from 'echarts';

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
) {
  if (chart.isDisposed()) return;
  try {
    chart.setOption(option);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`${context} setOption skipped:`, error);
    }
  }
}
