import { BarChart, CustomChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

import chartTheme from './theme.json';

echarts.use([
  LineChart,
  BarChart,
  CustomChart,
  PieChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);

echarts.registerTheme('momo', chartTheme);

export type { EChartsType } from 'echarts/core';
export { echarts };
