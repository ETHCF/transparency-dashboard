import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/utils/format';
import styles from './Charts.module.css';

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  colors?: string[];
  formatTooltip?: (value: number) => string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const DEFAULT_COLORS = [
  'var(--md-sys-color-primary)',
  'var(--md-sys-color-secondary)',
  'var(--md-sys-color-tertiary)',
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#14B8A6', // Teal
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for small slices

  return (
    <text
      x={x}
      y={y}
      fill="#1F2937"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="700"
      style={{ textShadow: '0 0 3px rgba(255,255,255,0.8)' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  colors = DEFAULT_COLORS,
  formatTooltip = (value) => formatCurrency(value),
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
}) => {
  return (
    <div className={styles.chartContainer}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={formatTooltip}
            contentStyle={{
              backgroundColor: 'var(--md-sys-color-surface)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              borderRadius: '8px',
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{
                paddingTop: '20px',
              }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};