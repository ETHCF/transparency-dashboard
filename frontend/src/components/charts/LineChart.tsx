import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { formatCurrency } from '@/utils/format';
import styles from './Charts.module.css';

interface LineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  yAxisLabel?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  type?: 'line' | 'area';
  gradient?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'date',
  yAxisLabel,
  height = 300,
  color = '#7E89CC',
  showGrid = true,
  formatYAxis = (value) => formatCurrency(value),
  formatTooltip = (value) => formatCurrency(value),
  type = 'line',
  gradient = true,
}) => {
  const Chart = type === 'area' ? AreaChart : RechartsLineChart;
  const DataLine = type === 'area' ? Area : Line;

  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="var(--md-sys-color-outline)" opacity={0.2} />
          )}
          <XAxis
            dataKey={xAxisKey}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 12 }}
            tickFormatter={formatYAxis}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft' } : undefined}
          />
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              backgroundColor: 'var(--md-sys-color-surface)',
              border: '1px solid var(--md-sys-color-outline)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <DataLine
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={gradient && type === 'area' ? 'url(#colorGradient)' : color}
            dot={{ fill: color, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </Chart>
      </ResponsiveContainer>
    </div>
  );
};