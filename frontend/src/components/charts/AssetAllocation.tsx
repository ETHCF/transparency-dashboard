import { formatCurrency } from '@/utils/format';
import styles from './AssetAllocation.module.css';

interface AssetAllocationProps {
  data: Array<{ name: string; value: number; symbol?: string }>;
}

const COLORS = [
  '#627EEA', // Ethereum Blue
  '#9B59B6', // Deep Purple
  '#48CC88', // Web3 Green
  '#F59E0B', // Ethereum Orange
  '#7E89CC', // Light Ethereum Blue
  '#3B82F6', // Info Blue
  '#EC4899', // Pink
  '#10B981', // Emerald
];

export const AssetAllocation: React.FC<AssetAllocationProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div className={styles.container}>
      <div className={styles.barContainer}>
        <div className={styles.bar}>
          {sortedData.map((item, index) => {
            const percentage = (item.value / total) * 100;
            if (percentage < 0.5) return null; // Skip very small allocations

            return (
              <div
                key={item.name}
                className={styles.segment}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: COLORS[index % COLORS.length],
                }}
                title={`${item.name}: ${percentage.toFixed(1)}%`}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.legend}>
        {sortedData.slice(0, 8).map((item, index) => {
          const percentage = (item.value / total) * 100;

          return (
            <div key={item.name} className={styles.legendItem}>
              <div className={styles.legendLeft}>
                <div
                  className={styles.legendDot}
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <div className={styles.legendInfo}>
                  <span className={styles.legendName}>
                    {item.symbol || item.name}
                  </span>
                  <span className={styles.legendPercent}>
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
              <span className={styles.legendValue}>
                {formatCurrency(item.value)}
              </span>
            </div>
          );
        })}

        {data.length > 8 && (
          <div className={styles.legendItem}>
            <div className={styles.legendLeft}>
              <div className={styles.legendDot} style={{ backgroundColor: '#8898AA' }} />
              <div className={styles.legendInfo}>
                <span className={styles.legendName}>
                  Others ({data.length - 8} more)
                </span>
                <span className={styles.legendPercent}>
                  {(data.slice(8).reduce((sum, item) => sum + item.value, 0) / total * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <span className={styles.legendValue}>
              {formatCurrency(data.slice(8).reduce((sum, item) => sum + item.value, 0))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};