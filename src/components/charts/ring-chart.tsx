'use client';

import type { EChartsOption, EChartsType } from 'echarts';
import * as echarts from 'echarts';
import { useEffect, useMemo, useRef, useState } from 'react';

import chartTheme from './theme.json';

// Register theme once at module level
const THEME_NAME = 'momo';
let themeRegistered = false;

function ensureThemeRegistered() {
  if (!themeRegistered && typeof window !== 'undefined') {
    echarts.registerTheme(THEME_NAME, chartTheme);
    themeRegistered = true;
  }
}

const OTHERS_LABEL = 'Others';
const TOP_COUNT = 4;

type RingItem = {
  category: string;
  totalCents: number;
};

type RingChartProps = {
  monthLabel: string;
  items: RingItem[];
  currency: string;
  onCategoryClick?: (payload: {
    monthLabel: string;
    category: string;
    totalCents: number;
  }) => void;
  onOthersClick?: (payload: {
    monthLabel: string;
    categories: string[];
    totalCents: number;
  }) => void;
};

function toDisplayAmount(amountCents: number, currency: string) {
  const divisor = currency === 'COP' ? 1 : 100;
  return amountCents / divisor;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

function prepareData(items: RingItem[]) {
  const sorted = [...items].sort(
    (left, right) => right.totalCents - left.totalCents,
  );
  const top = sorted.slice(0, TOP_COUNT);
  const rest = sorted.slice(TOP_COUNT);
  const othersTotal = rest.reduce((sum, item) => sum + item.totalCents, 0);

  const data: Array<{ name: string; value: number }> = top.map(item => ({
    name: item.category,
    value: item.totalCents,
  }));

  if (rest.length > 0) {
    data.push({ name: OTHERS_LABEL, value: othersTotal });
  }

  const totalCents = sorted.reduce((acc, item) => acc + item.totalCents, 0);

  return {
    seriesData: data,
    othersCategories: rest.map(item => item.category),
    totalCents,
  };
}

export function RingChart({
  monthLabel,
  items,
  currency,
  onCategoryClick,
  onOthersClick,
}: RingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [centerText, setCenterText] = useState({ name: 'Total', value: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  // Prepare data - memoized to prevent unnecessary effect triggers
  const { seriesData, othersCategories, totalCents } = useMemo(
    () => prepareData(items),
    [items],
  );

  const layout = useMemo(() => {
    const isDesktop = containerSize.width >= 768;
    const hasWrappedLegend = seriesData.length >= 5;
    const radius: [string, string] = ['52%', '72%'];
    const centerY = isDesktop ? '50%' : hasWrappedLegend ? '38%' : '42%';
    const legend = isDesktop
      ? {
          orient: 'vertical' as const,
          left: '58%',
          top: 'center',
          right: 'auto',
          bottom: 'auto',
        }
      : {
          orient: 'horizontal' as const,
          left: 'center',
          bottom: 12,
          right: 'auto',
          top: 'auto',
        };

    return {
      centerX: isDesktop ? '42%' : '50%',
      centerY,
      radius,
      legend,
    };
  }, [containerSize.width, seriesData.length]);

  // Initialize chart once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Register theme if not already done
    ensureThemeRegistered();

    // Initialize with theme
    const chart = echarts.init(containerRef.current, THEME_NAME, {
      renderer: 'canvas',
    });
    chartRef.current = chart;

    const option: EChartsOption = {
      legend: {
        show: true,
        icon: 'circle',
        itemHeight: 14,
        itemWidth: 14,
        itemGap: 12,
        ...layout.legend,
      },
      tooltip: {
        show: false,
      },
      series: [
        {
          type: 'pie',
          radius: layout.radius,
          center: [layout.centerX, layout.centerY],
          avoidLabelOverlap: false,
          label: {
            show: false,
          },
          labelLine: {
            show: false,
          },
          itemStyle: {
            borderRadius: 6,
            borderWidth: 1,
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
          },
          data: seriesData,
        },
      ],
    };

    chart.setOption(option);

    // Set initial center text
    setCenterText({
      name: 'Total',
      value: toDisplayAmount(totalCents, currency),
    });

    // Handle resize
    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
      chart.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initialize once

  // Set up event handlers (separate effect to use current values)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const handleMouseOver = (params: unknown) => {
      const p = params as { name?: string; value?: number };
      if (p.name && typeof p.value === 'number') {
        setCenterText({
          name: p.name,
          value: toDisplayAmount(p.value, currency),
        });
      }
    };

    const handleMouseOut = () => {
      setCenterText({
        name: 'Total',
        value: toDisplayAmount(totalCents, currency),
      });
    };

    const handleClick = (params: unknown) => {
      const p = params as { name?: string; value?: number };
      if (!p.name || typeof p.value !== 'number') return;

      if (p.name === OTHERS_LABEL) {
        onOthersClick?.({
          monthLabel,
          categories: othersCategories,
          totalCents: p.value,
        });
      } else {
        onCategoryClick?.({
          monthLabel,
          category: p.name,
          totalCents: p.value,
        });
      }
    };

    chart.on('mouseover', handleMouseOver);
    chart.on('mouseout', handleMouseOut);
    chart.on('click', handleClick);

    return () => {
      chart.off('mouseover', handleMouseOver);
      chart.off('mouseout', handleMouseOut);
      chart.off('click', handleClick);
    };
  }, [
    currency,
    totalCents,
    monthLabel,
    othersCategories,
    onCategoryClick,
    onOthersClick,
  ]);

  // Update chart data when items change
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    chart.setOption({
      legend: {
        ...layout.legend,
      },
      series: [
        {
          radius: layout.radius,
          center: [layout.centerX, layout.centerY],
          data: seriesData,
        },
      ],
    });
  }, [
    layout.centerX,
    layout.centerY,
    layout.legend,
    layout.radius,
    seriesData,
  ]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          top: layout.centerY,
          left: layout.centerX,
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: 'rgb(2, 0, 32)',
          }}
        >
          {centerText.name}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 16,
            color: 'rgb(2, 0, 32)',
          }}
        >
          {formatCurrency(centerText.value, currency)}
        </div>
      </div>
    </div>
  );
}
