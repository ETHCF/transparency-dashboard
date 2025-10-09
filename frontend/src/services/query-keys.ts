export const queryKeys = {
  treasury: () => ["treasury"] as const,
  treasuryWallets: () => ["treasury", "wallets"] as const,
  transfers: (params?: { limit?: number; offset?: number }) =>
    ["transfers", params ?? {}] as const,
  transferParties: (params?: { limit?: number; offset?: number }) =>
    ["transfer-parties", params ?? {}] as const,
  transferById: (id: string) => ["transfer", id] as const,
  expenses: (params?: unknown) => ["expenses", params ?? {}] as const,
  expenseById: (id: string) => ["expense", id] as const,
  grants: (params?: unknown) => ["grants", params ?? {}] as const,
  grantById: (id: string) => ["grant", id] as const,
  grantMilestones: (grantId: string) => ["grant", grantId, "milestones"] as const,
  grantDisbursements: (grantId: string) =>
    ["grant", grantId, "disbursements"] as const,
  grantFundsUsage: (grantId: string) =>
    ["grant", grantId, "funds-usage"] as const,
  admins: () => ["admins"] as const,
  auditLog: (params?: unknown) => ["audit-log", params ?? {}] as const,
  settings: () => ["settings"] as const,
  budgetAllocations: () => ["budget-allocations"] as const,
  categories: () => ["categories"] as const,
};
