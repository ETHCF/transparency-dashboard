import type {
  AdminActionDto,
  AdminDto,
  ExpenseDto,
  GrantDisbursementDto,
  GrantDto,
  GrantMilestoneDto,
  TransferDirection,
} from "@/types/api";

export interface TreasuryAsset {
  name: string;
  amount: number;
  usdWorth: number;
  ethWorth: number;
  address?: string;
  symbol?: string;
  decimals?: number;
}

export interface TreasuryWallet {
  address: string;
  etherscanUrl: string;
}

export interface TreasuryOverview {
  organizationName: string;
  totalValueUsd: number;
  totalValueEth: number;
  lastUpdated: Date;
  assets: TreasuryAsset[];
  wallets: TreasuryWallet[];
}

export interface TransferRecord {
  id: string;
  chain: string;
  txHash: string;
  etherscanUrl: string;
  direction: TransferDirection;
  payerName: string;
  payerAddress?: string;
  payeeName: string;
  payeeAddress?: string;
  timestamp: Date;
  blockNumber: number;
  asset: string;
  assetSymbol?: string;
  amount: number;
}

export interface Expense
  extends Omit<ExpenseDto, "date" | "price" | "receipts"> {
  date: Date;
  price: number;
  receipts: ExpenseReceipt[];
}

export interface ExpenseReceipt {
  id: string;
  name: string;
  downloadUrl: string;
}

export interface GrantMilestone
  extends Omit<GrantMilestoneDto, "grantAmount" | "createdAt" | "updatedAt"> {
  grantAmount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GrantDisbursement
  extends Omit<
    GrantDisbursementDto,
    "amount" | "createdAt" | "blockNumber" | "blockTimestamp"
  > {
  amount: number;
  blockNumber?: number;
  blockTimestamp?: number;
  createdAt?: Date;
}

export interface Grant
  extends Omit<
    GrantDto,
    | "startDate"
    | "expectedCompletionDate"
    | "amountGivenSoFar"
    | "totalGrantAmount"
    | "initialGrantAmount"
    | "milestones"
    | "disbursements"
    | "fundsUsage"
  > {
  startDate: Date;
  expectedCompletionDate: Date;
  amountGivenSoFar: number;
  totalGrantAmount: number;
  initialGrantAmount: number;
  milestones: GrantMilestone[];
  disbursements: GrantDisbursement[];
  fundsUsage: Expense[];
}

export interface Admin extends AdminDto {}

export interface AuditLogEntry extends Omit<AdminActionDto, "timestamp"> {
  timestamp: Date;
}
