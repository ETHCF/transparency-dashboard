import { useState, useMemo } from 'react';
import { formatCurrency } from '@/utils/format';
import { BarChart } from '@/components/charts/BarChart';
import styles from './BudgetTracker.module.css';

interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  period: 'monthly' | 'quarterly' | 'annual';
  department?: string;
  owner?: string;
}

interface BudgetTrackerProps {
  categories?: BudgetCategory[];
  showVariance?: boolean;
  enableEdit?: boolean;
}

// Generate mock budget data
const generateMockBudgetData = (): BudgetCategory[] => {
  const categories = [
    { name: 'Engineering', budget: 250000, variance: 0.92 },
    { name: 'Marketing', budget: 75000, variance: 1.15 },
    { name: 'Operations', budget: 50000, variance: 0.88 },
    { name: 'Legal & Compliance', budget: 30000, variance: 0.95 },
    { name: 'Infrastructure', budget: 45000, variance: 1.08 },
    { name: 'Grants & Bounties', budget: 100000, variance: 0.76 },
    { name: 'Community', budget: 25000, variance: 0.90 },
    { name: 'Research', budget: 60000, variance: 0.85 },
  ];

  return categories.map((cat, index) => ({
    id: `cat-${index}`,
    name: cat.name,
    budgeted: cat.budget,
    actual: cat.budget * cat.variance,
    period: 'monthly' as const,
    department: cat.name.toLowerCase().replace(/\s+/g, '-'),
    owner: ['alice.eth', 'bob.eth', 'charlie.eth'][index % 3],
  }));
};

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  categories = generateMockBudgetData(),
  showVariance = true,
  enableEdit = false,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState(categories);

  const totals = useMemo(() => {
    const totalBudgeted = budgetData.reduce((sum, cat) => sum + cat.budgeted, 0);
    const totalActual = budgetData.reduce((sum, cat) => sum + cat.actual, 0);
    const totalVariance = totalActual - totalBudgeted;
    const variancePercent = ((totalActual / totalBudgeted) - 1) * 100;

    return {
      budgeted: totalBudgeted,
      actual: totalActual,
      variance: totalVariance,
      variancePercent,
    };
  }, [budgetData]);

  const chartData = useMemo(() => {
    return budgetData.map(cat => ({
      name: cat.name,
      Budgeted: cat.budgeted,
      Actual: cat.actual,
      value: cat.actual, // For single bar charts
    }));
  }, [budgetData]);

  const handleEditBudget = (categoryId: string, newBudget: number) => {
    setBudgetData(prev =>
      prev.map(cat =>
        cat.id === categoryId ? { ...cat, budgeted: newBudget } : cat
      )
    );
    setEditingCategory(null);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0.1) return styles.overBudget;
    if (variance < -0.1) return styles.underBudget;
    return styles.onTrack;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Budget vs Actuals</h2>
        <div className={styles.controls}>
          <select
            className={styles.periodSelect}
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
          {enableEdit && (
            <button className={styles.addBtn}>
              + Add Category
            </button>
          )}
        </div>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Budget</span>
          <span className={styles.summaryValue}>
            {formatCurrency(totals.budgeted)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Actual Spend</span>
          <span className={styles.summaryValue}>
            {formatCurrency(totals.actual)}
          </span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Variance</span>
          <span className={`${styles.summaryValue} ${getVarianceColor(totals.variancePercent / 100)}`}>
            {formatCurrency(Math.abs(totals.variance))}
            <span className={styles.variancePercent}>
              ({totals.variancePercent > 0 ? '+' : ''}{totals.variancePercent.toFixed(1)}%)
            </span>
          </span>
        </div>
      </div>

      <div className={styles.chart}>
        <BarChart
          data={chartData}
          dataKey="value"
          multiBar={[
            { dataKey: 'Budgeted', color: '#7E89CC', name: 'Budgeted' },
            { dataKey: 'Actual', color: '#627EEA', name: 'Actual' },
          ]}
          height={300}
          showGrid={true}
        />
      </div>

      <div className={styles.categories}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budgeted</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>% of Budget</th>
              {enableEdit && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {budgetData.map(category => {
              const variance = category.actual - category.budgeted;
              const variancePercent = ((category.actual / category.budgeted) - 1) * 100;
              const budgetPercent = (category.budgeted / totals.budgeted) * 100;

              return (
                <tr key={category.id}>
                  <td className={styles.categoryName}>
                    <div>
                      <span className={styles.name}>{category.name}</span>
                      {category.owner && (
                        <span className={styles.owner}>@{category.owner}</span>
                      )}
                    </div>
                  </td>
                  <td className={styles.amount}>
                    {editingCategory === category.id ? (
                      <input
                        type="number"
                        className={styles.editInput}
                        defaultValue={category.budgeted}
                        onBlur={(e) => handleEditBudget(category.id, Number(e.target.value))}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleEditBudget(category.id, Number(e.currentTarget.value));
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      formatCurrency(category.budgeted)
                    )}
                  </td>
                  <td className={styles.amount}>
                    {formatCurrency(category.actual)}
                  </td>
                  <td className={`${styles.variance} ${getVarianceColor(variancePercent / 100)}`}>
                    <span>{variance > 0 ? '+' : ''}{formatCurrency(variance)}</span>
                    <span className={styles.variancePercent}>
                      ({variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%)
                    </span>
                  </td>
                  <td className={styles.progress}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${Math.min(budgetPercent, 100)}%`,
                          background: variance > 0 ? '#E74C3C' : '#48CC88',
                        }}
                      />
                    </div>
                    <span className={styles.progressText}>
                      {budgetPercent.toFixed(1)}%
                    </span>
                  </td>
                  {enableEdit && (
                    <td className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => setEditingCategory(category.id)}
                      >
                        ✏️
                      </button>
                      <button className={styles.deleteBtn}>
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showVariance && (
        <div className={styles.insights}>
          <h3 className={styles.insightsTitle}>Budget Insights</h3>
          <div className={styles.insightsList}>
            {totals.variancePercent > 5 && (
              <div className={`${styles.insight} ${styles.warning}`}>
                ⚠️ Total spending is {totals.variancePercent.toFixed(1)}% over budget
              </div>
            )}
            {totals.variancePercent < -10 && (
              <div className={`${styles.insight} ${styles.success}`}>
                ✅ Total spending is {Math.abs(totals.variancePercent).toFixed(1)}% under budget
              </div>
            )}
            {budgetData.filter(cat => (cat.actual / cat.budgeted) > 1.2).map(cat => (
              <div key={cat.id} className={`${styles.insight} ${styles.warning}`}>
                📊 {cat.name} is {(((cat.actual / cat.budgeted) - 1) * 100).toFixed(0)}% over budget
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};