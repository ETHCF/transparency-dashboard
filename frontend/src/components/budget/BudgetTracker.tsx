import { useState, useMemo } from 'react';
import { formatCurrency } from '@/utils/format';
import { BarChart } from '@/components/charts/BarChart';
import { useBudgetAllocationsQuery } from '@/services/budgets';
import { useExpensesQuery } from '@/services/expenses';
import { Loader } from '@/components/common/Loader';
import { ErrorState } from '@/components/common/ErrorState';
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
  showVariance?: boolean;
}

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  showVariance = true,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');

  const budgetAllocationsQuery = useBudgetAllocationsQuery();
  const expensesQuery = useExpensesQuery({});

  const budgetData = useMemo(() => {
    if (!budgetAllocationsQuery.data || !expensesQuery.data) {
      return [];
    }

    // Calculate actual spending per category from expenses
    const expensesByCategory = expensesQuery.data.reduce((acc, expense) => {
      const category = expense.category;
      const total = expense.price * expense.quantity;
      acc[category] = (acc[category] || 0) + total;
      return acc;
    }, {} as Record<string, number>);

    // Map budget allocations to BudgetCategory format
    return budgetAllocationsQuery.data.map((allocation) => ({
      id: allocation.id,
      name: allocation.category,
      budgeted: parseFloat(allocation.amount),
      actual: expensesByCategory[allocation.category] || 0,
      period: 'monthly' as const,
      department: allocation.category.toLowerCase().replace(/\s+/g, '-'),
      owner: allocation.manager || undefined,
    }));
  }, [budgetAllocationsQuery.data, expensesQuery.data]);

  if (budgetAllocationsQuery.isPending || expensesQuery.isPending) {
    return <Loader label="Loading budget data" />;
  }

  if (budgetAllocationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load budget allocations"
        description={budgetAllocationsQuery.error?.message}
      />
    );
  }

  if (expensesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load expenses"
        description={expensesQuery.error?.message}
      />
    );
  }

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
                    {formatCurrency(category.budgeted)}
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