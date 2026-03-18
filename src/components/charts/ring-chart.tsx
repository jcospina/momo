'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { type EChartsType, echarts } from './echarts-init';
import { safeResize, safeSetOption } from './echarts-safe';

const THEME_NAME = 'momo';

export type RingChartItem = {
  name: string;
  value: number;
};

export type RingChartProps = {
  items: RingChartItem[];
  currency: string;
  centerLabel?: string;
  onItemClick?: (payload: RingChartItem) => void;
  getTooltipLines?: (payload: RingChartItem) => string[];
};

function toDisplayAmount(amountCents: number, currency: string) {
  const divisor = currency === 'COP' ? 1 : 100;
  return amountCents / divisor;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'COP' ? 'narrowSymbol' : 'symbol',
    maximumFractionDigits: currency === 'COP' ? 0 : 2,
  }).format(amount);
}

export function RingChart({
  items,
  currency,
  centerLabel = 'Total',
  onItemClick,
  getTooltipLines,
}: RingChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);
  const [centerText, setCenterText] = useState({ name: centerLabel, value: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 0,
    height: 0,
  });

  const totalCents = useMemo(
    () => items.reduce((sum, item) => sum + (item.value ?? 0), 0),
    [items],
  );

  const seriesData = useMemo(
    () => items.map(item => ({ name: item.name, value: item.value })),
    [items],
  );

  const layout = useMemo(() => {
    const isDesktop = containerSize.width >= 768;
    const legendRows = isDesktop ? 1 : Math.ceil(seriesData.length / 2);
    const compact = !isDesktop && legendRows >= 2;
    const radius: [string, string] = compact ? ['48%', '68%'] : ['52%', '72%'];
    const centerY = isDesktop ? '50%' : compact ? '36%' : '42%';
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

  useEffect(() => {
    setCenterText({
      name: centerLabel,
      value: toDisplayAmount(totalCents, currency),
    });
  }, [centerLabel, currency, totalCents]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current, THEME_NAME, {
      renderer: 'canvas',
    });
    chartRef.current = chart;
    const initialRect = containerRef.current.getBoundingClientRect();
    setContainerSize({
      width: initialRect.width,
      height: initialRect.height,
    });

    const resizeObserver = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
      safeResize(chart, entry, 'RingChart');
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

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
        name: centerLabel,
        value: toDisplayAmount(totalCents, currency),
      });
    };

    const handleLegendChange = (params: unknown) => {
      const p = params as { selected?: Record<string, boolean> };
      const selected = p.selected ?? {};
      const visibleTotal = items.reduce((sum, item) => {
        if (selected[item.name] === false) return sum;
        return sum + item.value;
      }, 0);
      setCenterText({
        name: centerLabel,
        value: toDisplayAmount(visibleTotal, currency),
      });
    };

    const handleClick = (params: unknown) => {
      if (!onItemClick) return;
      const p = params as { name?: string; value?: number };
      if (!p.name || typeof p.value !== 'number') return;
      onItemClick({ name: p.name, value: p.value });
    };

    chart.on('mouseover', handleMouseOver);
    chart.on('mouseout', handleMouseOut);
    chart.on('legendselectchanged', handleLegendChange);
    chart.on('click', handleClick);

    return () => {
      chart.off('mouseover', handleMouseOver);
      chart.off('mouseout', handleMouseOut);
      chart.off('legendselectchanged', handleLegendChange);
      chart.off('click', handleClick);
    };
  }, [centerLabel, currency, items, onItemClick, totalCents]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    safeSetOption(
      chart,
      {
        legend: {
          ...layout.legend,
        },
        tooltip: {
          show: true,
          confine: true,
          position: (
            point: number[],
            _params: unknown,
            _dom: unknown,
            _rect: unknown,
            size: { contentSize: number[]; viewSize: number[] },
          ) => {
            const [x, y] = point;
            const [contentWidth, contentHeight] = size.contentSize;
            const [viewWidth, viewHeight] = size.viewSize;
            const clampedX = Math.min(
              Math.max(x, 8),
              Math.max(8, viewWidth - contentWidth - 8),
            );
            const clampedY = Math.min(
              Math.max(y, 8),
              Math.max(8, viewHeight - contentHeight - 8),
            );
            return [clampedX, clampedY];
          },
          formatter: (params: unknown) => {
            const p = params as {
              name?: string;
              value?: number;
              percent?: number;
            };
            if (!p || typeof p.value !== 'number' || !p.name) return '';
            const amount = formatCurrency(
              toDisplayAmount(p.value, currency),
              currency,
            );
            const percent = Number.isFinite(p.percent) ? p.percent : 0;
            const extra =
              getTooltipLines?.({ name: p.name, value: p.value }) ?? [];
            return [
              `<strong>${p.name}</strong>`,
              `${amount} (${percent!.toFixed(1)}%)`,
              ...extra,
            ].join('<br/>');
          },
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
      },
      'RingChart',
      true,
    );
  }, [
    currency,
    getTooltipLines,
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
