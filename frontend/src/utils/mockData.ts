import type { TransferRecord, Expense, Grant, TreasuryAsset } from '@/types/domain';

// Generate mock transfers with realistic patterns
export const generateMockTransfers = (count: number = 100): TransferRecord[] => {
  const transfers: TransferRecord[] = [];
  const now = Date.now();
  const addresses = [
    '0x554c5aF96E9e3c05AEC01ce18221d0DD25975aB4', // Treasury wallet (zak.eth)
    '0x1234567890123456789012345678901234567890',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0x9876543210987654321098765432109876543210',
    '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
  ];

  const tokens = [
    { symbol: 'ETH', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', decimals: 18 },
    { symbol: 'USDC', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', decimals: 6 },
    { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
    { symbol: 'WETH', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18 },
  ];

  for (let i = 0; i < count; i++) {
    const isIncoming = Math.random() > 0.4; // 60% incoming
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const amount = Math.random() * 10000 + 100;
    const ethPrice = 2000 + Math.random() * 500; // ETH price between 2000-2500

    transfers.push({
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      blockNumber: 18000000 + i * 100,
      blockTimestamp: new Date(now - (count - i) * 3600000 * 24).toISOString(), // Daily transfers
      asset: token.address,
      assetSymbol: token.symbol,
      amount: Math.floor(amount * Math.pow(10, token.decimals)).toString(),
      fromAddress: isIncoming ? addresses[Math.floor(Math.random() * (addresses.length - 1)) + 1] : addresses[0],
      toAddress: isIncoming ? addresses[0] : addresses[Math.floor(Math.random() * (addresses.length - 1)) + 1],
      direction: isIncoming ? 'incoming' : 'outgoing',
      usdWorth: token.symbol === 'ETH' || token.symbol === 'WETH'
        ? amount * ethPrice
        : token.symbol === 'USDC' || token.symbol === 'USDT' || token.symbol === 'DAI'
        ? amount
        : amount * 10,
      fromName: isIncoming ? `Wallet ${Math.floor(Math.random() * 10)}` : 'Treasury',
      toName: isIncoming ? 'Treasury' : `Grant Recipient ${Math.floor(Math.random() * 10)}`,
    });
  }

  return transfers.sort((a, b) =>
    new Date(b.blockTimestamp || 0).getTime() - new Date(a.blockTimestamp || 0).getTime()
  );
};

// Generate mock expenses with categories
export const generateMockExpenses = (count: number = 50): Expense[] => {
  const categories = ['Infrastructure', 'Marketing', 'Development', 'Legal', 'Operations', 'Research', 'Travel', 'Software'];
  const expenses: Expense[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 365);
    expenses.push({
      id: `expense-${i}`,
      item: `${categories[Math.floor(Math.random() * categories.length)]} - Item ${i}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      date: new Date(now - daysAgo * 24 * 3600000).toISOString(),
      price: Math.floor(Math.random() * 50000) + 500,
      description: `Mock expense description for testing dashboard visualization ${i}`,
      txHash: Math.random() > 0.5 ? `0x${Math.random().toString(16).substring(2, 66)}` : undefined,
    });
  }

  return expenses.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
};

// Generate mock grants
export const generateMockGrants = (count: number = 15): Grant[] => {
  const grants: Grant[] = [];
  const statuses = ['active', 'completed', 'pending', 'milestone 3 of 5'];

  for (let i = 0; i < count; i++) {
    const totalAmount = Math.floor(Math.random() * 1000) + 50;
    const givenPercentage = Math.random();

    grants.push({
      id: `grant-${i}`,
      name: `Grant Program ${i + 1}`,
      recipientName: `Recipient ${i + 1}`,
      recipientAddress: `0x${Math.random().toString(16).substring(2, 42)}`,
      description: `This is a mock grant for testing the dashboard visualization capabilities. Grant ${i + 1} focuses on ecosystem development.`,
      amount: totalAmount,
      amountGivenSoFar: Math.floor(totalAmount * givenPercentage),
      startDate: new Date(Date.now() - Math.random() * 365 * 24 * 3600000).toISOString(),
      endDate: new Date(Date.now() + Math.random() * 365 * 24 * 3600000).toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });
  }

  return grants;
};

// Generate mock treasury assets
export const generateMockAssets = (): TreasuryAsset[] => {
  return [
    {
      chainId: 1,
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      amount: '125.5',
      ethWorth: 125.5,
      usdWorth: 251000,
    },
    {
      chainId: 1,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      amount: '500000',
      ethWorth: 250,
      usdWorth: 500000,
    },
    {
      chainId: 1,
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
      amount: '250000',
      ethWorth: 125,
      usdWorth: 250000,
    },
    {
      chainId: 1,
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
      amount: '150000',
      ethWorth: 75,
      usdWorth: 150000,
    },
    {
      chainId: 1,
      address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      name: 'Wrapped Ether',
      symbol: 'WETH',
      decimals: 18,
      amount: '50',
      ethWorth: 50,
      usdWorth: 100000,
    },
    {
      chainId: 1,
      address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
      amount: '5000',
      ethWorth: 15,
      usdWorth: 30000,
    },
    {
      chainId: 1,
      address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      name: 'Uniswap',
      symbol: 'UNI',
      decimals: 18,
      amount: '3000',
      ethWorth: 10,
      usdWorth: 20000,
    },
    {
      chainId: 1,
      address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
      name: 'Aave Token',
      symbol: 'AAVE',
      decimals: 18,
      amount: '200',
      ethWorth: 8,
      usdWorth: 16000,
    },
  ];
};

// Generate historical balance data for charts
export const generateHistoricalBalances = (days: number = 90) => {
  const data = [];
  const now = Date.now();
  let balance = 800000; // Starting balance

  for (let i = days; i >= 0; i--) {
    // Simulate balance changes
    const dailyChange = (Math.random() - 0.45) * 20000; // Slightly positive trend
    balance = Math.max(100000, balance + dailyChange);

    data.push({
      date: new Date(now - i * 24 * 3600000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      balance: Math.floor(balance),
      timestamp: new Date(now - i * 24 * 3600000).toISOString(),
    });
  }

  return data;
};

// Generate mock activity feed
export const generateActivityFeed = (count: number = 20) => {
  const activities = [];
  const types = ['transfer_in', 'transfer_out', 'grant_disbursement', 'expense', 'asset_swap'];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const hoursAgo = Math.floor(Math.random() * 72);

    activities.push({
      id: `activity-${i}`,
      type,
      description: getActivityDescription(type, i),
      amount: Math.floor(Math.random() * 10000) + 100,
      timestamp: new Date(now - hoursAgo * 3600000).toISOString(),
      txHash: `0x${Math.random().toString(16).substring(2, 66)}`,
    });
  }

  return activities.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

function getActivityDescription(type: string, index: number): string {
  switch (type) {
    case 'transfer_in':
      return `Received funds from Wallet ${index}`;
    case 'transfer_out':
      return `Sent payment to Recipient ${index}`;
    case 'grant_disbursement':
      return `Grant disbursement to Project ${index}`;
    case 'expense':
      return `Expense payment for Service ${index}`;
    case 'asset_swap':
      return `Swapped ETH for USDC`;
    default:
      return `Activity ${index}`;
  }
}

// Calculate burn rate explanation
export const getBurnRateExplanation = () => {
  return {
    calculation: "Burn Rate = Total Expenses in Last 30 Days",
    runway: "Runway = Total Treasury Value / Monthly Burn Rate",
    example: "If you spent $50,000 in the last 30 days and have $1,000,000 in treasury, your runway is 20 months",
    factors: [
      "Operating expenses",
      "Grant disbursements",
      "Infrastructure costs",
      "Team salaries",
      "Marketing spend"
    ]
  };
};