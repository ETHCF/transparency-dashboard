import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useExpensesQuery } from "@/services/expenses";
import { generateMockExpenses } from "@/utils/mockData";
import { formatCurrency } from "@/utils/format";
import styles from "./routes.module.css";

export const Route = createFileRoute("/expense")({
  component: ExpensesPage,
});

function ExpensesPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "week" | "month" | "quarter" | "year">("month");
  const { data: apiExpenses = [], isLoading } = useExpensesQuery();

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  const mockExpenses = useMemo(() => generateMockExpenses(100), []);
  const expenses = isDevMode && apiExpenses.length === 0 ? mockExpenses : apiExpenses;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    expenses.forEach(expense => expense.category && cats.add(expense.category));
    return Array.from(cats).sort();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    // Filter by time
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeFilter) {
      case "week":
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case "month":
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    if (timeFilter !== "all") {
      filtered = filtered.filter(expense =>
        new Date(expense.date) >= cutoffDate
      );
    }

    return filtered;
  }, [expenses, categoryFilter, timeFilter]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + (expense.price || 0), 0);
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    const breakdown: { [key: string]: number } = {};
    filteredExpenses.forEach(expense => {
      const cat = expense.category || "Uncategorized";
      breakdown[cat] = (breakdown[cat] || 0) + (expense.price || 0);
    });
    return Object.entries(breakdown)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Expenses</h1>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Expenses</div>
            <div className={styles.statValue}>{formatCurrency(totalExpenses)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Transactions</div>
            <div className={styles.statValue}>{filteredExpenses.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg. Expense</div>
            <div className={styles.statValue}>
              {filteredExpenses.length > 0
                ? formatCurrency(totalExpenses / filteredExpenses.length)
                : "$0"
              }
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Categories</div>
            <div className={styles.statValue}>{categories.length}</div>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Time Period:</span>
          <button
            className={`${styles.filterBtn} ${timeFilter === "all" ? styles.active : ""}`}
            onClick={() => setTimeFilter("all")}
          >
            All Time
          </button>
          <button
            className={`${styles.filterBtn} ${timeFilter === "week" ? styles.active : ""}`}
            onClick={() => setTimeFilter("week")}
          >
            Past Week
          </button>
          <button
            className={`${styles.filterBtn} ${timeFilter === "month" ? styles.active : ""}`}
            onClick={() => setTimeFilter("month")}
          >
            Past Month
          </button>
          <button
            className={`${styles.filterBtn} ${timeFilter === "quarter" ? styles.active : ""}`}
            onClick={() => setTimeFilter("quarter")}
          >
            Past Quarter
          </button>
          <button
            className={`${styles.filterBtn} ${timeFilter === "year" ? styles.active : ""}`}
            onClick={() => setTimeFilter("year")}
          >
            Past Year
          </button>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Category:</span>
          <select
            className={styles.filterSelect}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.gridLayout}>
        <div>
          <h2 className={styles.sectionTitle}>Category Breakdown</h2>
          <div className={styles.categoryBreakdown}>
            <div className={styles.breakdownList}>
              {categoryBreakdown.map(({ category, amount }) => {
                const percentage = (amount / totalExpenses) * 100;
                return (
                  <div key={category} className={styles.breakdownItem}>
                    <div className={styles.breakdownHeader}>
                      <span className={styles.categoryName}>{category}</span>
                      <span className={styles.categoryAmount}>{formatCurrency(amount)}</span>
                    </div>
                    <div className={styles.breakdownBar}>
                      <div
                        className={styles.breakdownFill}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className={styles.breakdownPercentage}>{percentage.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.expensesList}>
          <h2 className={styles.sectionTitle}>Recent Expenses</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.slice(0, 50).map((expense) => (
                  <tr key={expense.id}>
                    <td className={styles.date}>
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td>
                      <div className={styles.expenseItem}>
                        <div className={styles.primaryText}>{expense.item}</div>
                        {expense.description && (
                          <div className={styles.secondaryText}>{expense.description}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.category} ${styles[`cat-${expense.category?.toLowerCase().replace(/\s+/g, '-')}`]}`}>
                        {expense.category || "Uncategorized"}
                      </span>
                    </td>
                    <td className={styles.amount}>{formatCurrency(expense.price)}</td>
                    <td>
                      {expense.txHash ? (
                        <a
                          href={`https://etherscan.io/tx/${expense.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.txLink}
                        >
                          {expense.txHash.slice(0, 6)}...{expense.txHash.slice(-4)}
                        </a>
                      ) : (
                        <span className={styles.noTx}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}