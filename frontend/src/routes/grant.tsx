import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGrantsQuery } from "@/services/grants";
import { generateMockGrants } from "@/utils/mockData";
import { formatCurrency } from "@/utils/format";
import styles from "./routes.module.css";

export const Route = createFileRoute("/grant")({
  component: GrantsPage,
});

function GrantsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "pending">("all");
  const { data: apiGrants = [], isLoading } = useGrantsQuery();

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
  const mockGrants = useMemo(() => generateMockGrants(25), []);
  const grants = isDevMode && apiGrants.length === 0 ? mockGrants : apiGrants;

  const filteredGrants = useMemo(() => {
    if (statusFilter === "all") return grants;

    return grants.filter((grant) => {
      if (statusFilter === "active") return grant.status?.includes("milestone") || grant.status === "active";
      if (statusFilter === "completed") return grant.status === "completed";
      if (statusFilter === "pending") return grant.status === "pending";
      return true;
    });
  }, [grants, statusFilter]);

  const totalGrantValue = useMemo(() => {
    return grants.reduce((sum, grant) => sum + (grant.amount || 0), 0);
  }, [grants]);

  const totalDisbursed = useMemo(() => {
    return grants.reduce((sum, grant) => sum + (grant.amountGivenSoFar || 0), 0);
  }, [grants]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading grants...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Grants</h1>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Grants</div>
            <div className={styles.statValue}>{grants.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Value</div>
            <div className={styles.statValue}>{formatCurrency(totalGrantValue)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Disbursed</div>
            <div className={styles.statValue}>{formatCurrency(totalDisbursed)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Remaining</div>
            <div className={styles.statValue}>{formatCurrency(totalGrantValue - totalDisbursed)}</div>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterBtn} ${statusFilter === "all" ? styles.active : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          All ({grants.length})
        </button>
        <button
          className={`${styles.filterBtn} ${statusFilter === "active" ? styles.active : ""}`}
          onClick={() => setStatusFilter("active")}
        >
          Active ({grants.filter(g => g.status?.includes("milestone") || g.status === "active").length})
        </button>
        <button
          className={`${styles.filterBtn} ${statusFilter === "completed" ? styles.active : ""}`}
          onClick={() => setStatusFilter("completed")}
        >
          Completed ({grants.filter(g => g.status === "completed").length})
        </button>
        <button
          className={`${styles.filterBtn} ${statusFilter === "pending" ? styles.active : ""}`}
          onClick={() => setStatusFilter("pending")}
        >
          Pending ({grants.filter(g => g.status === "pending").length})
        </button>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Grant Name</th>
              <th>Recipient</th>
              <th>Total Amount</th>
              <th>Disbursed</th>
              <th>Progress</th>
              <th>Status</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredGrants.map((grant) => {
              const progress = grant.amount ? (grant.amountGivenSoFar / grant.amount) * 100 : 0;
              const endDate = grant.endDate ? new Date(grant.endDate) : null;
              const isOverdue = endDate && endDate < new Date() && grant.status !== "completed";

              return (
                <tr key={grant.id}>
                  <td>
                    <div className={styles.grantName}>
                      <div className={styles.primaryText}>{grant.name}</div>
                      <div className={styles.secondaryText}>{grant.description}</div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.recipient}>
                      <div className={styles.primaryText}>{grant.recipientName}</div>
                      <div className={styles.addressText}>
                        {grant.recipientAddress?.slice(0, 6)}...{grant.recipientAddress?.slice(-4)}
                      </div>
                    </div>
                  </td>
                  <td className={styles.amount}>{formatCurrency(grant.amount)}</td>
                  <td className={styles.amount}>{formatCurrency(grant.amountGivenSoFar)}</td>
                  <td>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <span className={styles.progressText}>{progress.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.status} ${styles[`status-${grant.status?.split(' ')[0]}`]}`}>
                      {grant.status}
                    </span>
                  </td>
                  <td className={isOverdue ? styles.overdue : ""}>
                    {endDate?.toLocaleDateString()}
                    {isOverdue && <span className={styles.overdueLabel}> (Overdue)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}