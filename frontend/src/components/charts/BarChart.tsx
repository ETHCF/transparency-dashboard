import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/utils/format';
import styles from './Charts.module.css';

interface BarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  yAxisLabel?: string;
  height?: number;
  color?: string;
  showGrid?: boolean;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number) => string;
  barColors?: string[];
  multiBar?: Array<{ dataKey: string; color: string; name: string }>;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'name',
  yAxisLabel,
  height = 300,
  color = '#627EEA',
  showGrid = true,
  formatYAxis = (value) => formatCurrency(value),
  formatTooltip = (value) => formatCurrency(value),
  barColors,
  multiBar,
}) => {
  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={1} />
              <stop offset="95%" stopColor={color} stopOpacity={0.7} />
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
          {multiBar ? (
            <>
              <Legend />
              {multiBar.map((bar) => (
                <Bar
                  key={bar.dataKey}
                  dataKey={bar.dataKey}
                  fill={bar.color}
                  name={bar.name}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </>
          ) : (
            <Bar dataKey={dataKey} fill="url(#barGradient)" radius={[8, 8, 0, 0]}>
              {barColors &&
                data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                ))}
            </Bar>
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};