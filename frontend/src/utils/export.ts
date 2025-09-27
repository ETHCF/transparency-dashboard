import { formatCurrency, formatDate, formatDateTime } from './format';
import type { TransferRecord, Grant, Expense } from '@/types/domain';

// CSV Export
export const exportToCSV = (data: any[], filename: string, headers?: Record<string, string>) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get all unique keys from the data
  const keys = Array.from(new Set(data.flatMap(Object.keys)));

  // Create CSV header row
  const headerRow = keys.map(key => headers?.[key] || key).join(',');

  // Create CSV data rows
  const rows = data.map(item => {
    return keys.map(key => {
      const value = item[key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  // Combine header and rows
  const csv = [headerRow, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Transfer-specific export
export const exportTransfers = (transfers: TransferRecord[], format: 'csv' | 'json' = 'csv') => {
  const exportData = transfers.map(t => ({
    date: formatDateTime(t.blockTimestamp),
    txHash: t.txHash,
    from: t.fromAddress,
    fromName: t.fromName || '',
    to: t.toAddress,
    toName: t.toName || '',
    amount: t.amount ? (Number(t.amount) / 1e18).toFixed(6) : '0',
    asset: t.assetSymbol,
    usdValue: t.usdWorth || 0,
    category: t.category || '',
    tags: t.tags?.join(';') || '',
    direction: t.direction,
    blockNumber: t.blockNumber,
  }));

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transfers_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  } else {
    exportToCSV(exportData, 'transfers', {
      date: 'Date',
      txHash: 'Transaction Hash',
      from: 'From Address',
      fromName: 'From Name',
      to: 'To Address',
      toName: 'To Name',
      amount: 'Amount',
      asset: 'Asset',
      usdValue: 'USD Value',
      category: 'Category',
      tags: 'Tags',
      direction: 'Direction',
      blockNumber: 'Block Number',
    });
  }
};

// Grants export
export const exportGrants = (grants: Grant[], format: 'csv' | 'json' = 'csv') => {
  const exportData = grants.map(g => ({
    id: g.id,
    title: g.title,
    recipient: g.recipient,
    amount: g.amount,
    status: g.status,
    startDate: formatDate(g.startDate),
    endDate: formatDate(g.endDate),
    description: g.description,
    milestones: g.milestones.length,
    disbursed: g.disbursed,
    category: g.category,
  }));

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(grants, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `grants_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  } else {
    exportToCSV(exportData, 'grants');
  }
};

// Expenses export
export const exportExpenses = (expenses: Expense[], format: 'csv' | 'json' = 'csv') => {
  const exportData = expenses.map(e => ({
    id: e.id,
    date: formatDate(e.date),
    description: e.description,
    amount: e.amount,
    category: e.category,
    vendor: e.vendor,
    status: e.status,
    approvedBy: e.approvedBy,
    receipt: e.receipt ? 'Yes' : 'No',
    recurring: e.recurring ? 'Yes' : 'No',
    tags: e.tags?.join(';') || '',
  }));

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(expenses, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  } else {
    exportToCSV(exportData, 'expenses');
  }
};

// Generate PDF report
export const generatePDFReport = async (data: {
  treasury: any;
  transfers: TransferRecord[];
  grants: Grant[];
  expenses: Expense[];
  dateRange: { start: Date; end: Date };
}) => {
  // This would integrate with a library like jsPDF or use server-side generation
  // For now, we'll create a formatted HTML report that can be printed to PDF

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Treasury Report - ${formatDate(new Date())}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }
        h1 { color: #627EEA; border-bottom: 2px solid #627EEA; padding-bottom: 10px; }
        h2 { color: #2E3338; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #F7F8FA; text-align: left; padding: 10px; border-bottom: 2px solid #DDE1E8; }
        td { padding: 8px; border-bottom: 1px solid #EFF1F5; }
        .summary { background: #F7F8FA; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .metric { margin: 10px 0; }
        .metric-label { font-weight: 600; color: #5A5F66; }
        .metric-value { font-size: 1.2em; color: #2E3338; margin-left: 10px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #DDE1E8; color: #71717A; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <h1>Treasury Transparency Report</h1>
      <p>Generated on ${formatDateTime(new Date())}</p>

      <div class="summary">
        <h2>Executive Summary</h2>
        <div class="metric">
          <span class="metric-label">Total Assets:</span>
          <span class="metric-value">${formatCurrency(data.treasury?.totalValue || 0)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Monthly Burn Rate:</span>
          <span class="metric-value">${formatCurrency(data.treasury?.burnRate || 0)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Runway:</span>
          <span class="metric-value">${data.treasury?.runway || 0} months</span>
        </div>
        <div class="metric">
          <span class="metric-label">Active Grants:</span>
          <span class="metric-value">${data.grants.filter(g => g.status === 'active').length}</span>
        </div>
      </div>

      <h2>Recent Transfers (Last 30 Days)</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>From/To</th>
            <th>Amount</th>
            <th>USD Value</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          ${data.transfers.slice(0, 20).map(t => `
            <tr>
              <td>${formatDate(t.blockTimestamp)}</td>
              <td>${t.direction === 'outgoing' ? t.toName || t.toAddress?.slice(0, 10) + '...' : t.fromName || t.fromAddress?.slice(0, 10) + '...'}</td>
              <td>${t.amount ? (Number(t.amount) / 1e18).toFixed(4) : '0'} ${t.assetSymbol}</td>
              <td>${formatCurrency(t.usdWorth || 0)}</td>
              <td>${t.category || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>Active Grants</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Recipient</th>
            <th>Amount</th>
            <th>Progress</th>
            <th>End Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.grants.filter(g => g.status === 'active').map(g => `
            <tr>
              <td>${g.title}</td>
              <td>${g.recipient}</td>
              <td>${formatCurrency(g.amount)}</td>
              <td>${((g.disbursed / g.amount) * 100).toFixed(0)}%</td>
              <td>${formatDate(g.endDate)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        <p>This report is auto-generated from on-chain data and internal records.</p>
        <p>For questions or corrections, contact treasury@organization.com</p>
      </div>
    </body>
    </html>
  `;

  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

// Export dashboard snapshot
export const exportDashboardSnapshot = (dashboardData: any) => {
  const snapshot = {
    timestamp: new Date().toISOString(),
    treasury: dashboardData.treasury,
    assets: dashboardData.assets,
    metrics: {
      totalValue: dashboardData.totalValue,
      monthlyBurnRate: dashboardData.burnRate,
      runway: dashboardData.runway,
      transactionCount: dashboardData.transactionCount,
    },
    recentActivity: dashboardData.recentTransfers?.slice(0, 50),
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dashboard_snapshot_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};