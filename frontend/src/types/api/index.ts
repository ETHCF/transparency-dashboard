export type TransferDirection = "incoming" | "outgoing";

export interface TreasuryAssetDto {
  name: string;
  amount: string;
  usdWorth: number;
  ethWorth: string;
  address?: string;
  symbol?: string;
  decimals?: number | string | null;
}

export interface TreasuryWalletDto {
  address: string;
  etherscanLink?: string;
}

export interface TreasuryAssetPayload {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface TreasuryWalletBalanceDto {
  chainId?: number;
  address: string;
  wallet: string;
  amount: string;
  usdWorth?: number | string;
  ethWorth?: string | number;
  lastUpdated?: string;
  assetName?: string | null;
  assetSymbol?: string | null;
}

export interface TreasuryWalletPayload {
  address: string;
}

export interface TreasuryResponseDto {
  organizationName?: string | null;
  assets?: TreasuryAssetDto[] | null;
  walletBalances?: TreasuryWalletBalanceDto[] | null;
  wallets?: TreasuryWalletDto[] | null;
  totalValueUsd?: number | string | null;
  totalValueEth?: string | number | null;
  totalFundsRaised?: number | string | null;
  lastUpdated?: string | null;
}

export interface TransferPartyDto {
  name: string;
  address: string;
}

export interface TransferPartyPayload {
  address: string;
  name: string;
}

export interface TransferDto {
  chain: string;
  txHash: string;
  etherscanLink: string;
  direction: TransferDirection;
  payer_name?: string | null;
  payerName?: string | null;
  payer_address?: string | null;
  payerAddress?: string | null;
  payee_name?: string | null;
  payeeName?: string | null;
  payee_address?: string | null;
  payeeAddress?: string | null;
  payer?: TransferPartyDto | null;
  payee?: TransferPartyDto | null;
  timestamp?: string | null;
  blockTimestamp?: number | string | null;
  blockNumber: number;
  asset: string;
  assetSymbol?: string | null;
  asset_symbol?: string | null;
  amount: string;
}

export interface ExpenseReceiptDto {
  uuid: string;
  name: string;
  downloadUrl: string;
}

export interface ExpenseDto {
  id: string;
  item: string;
  quantity: number;
  price: number;
  purpose: string;
  category: string;
  receipts: ExpenseReceiptDto[];
  date: string;
  txHash?: string | null;
}

export interface AdminDto {
  name: string;
  address: string;
}

export interface AdminActionDto {
  id: string;
  adminAddress: string;
  adminName: string;
  action:
    | "create_expense"
    | "update_expense"
    | "delete_expense"
    | "upload_receipt"
    | "delete_receipt"
    | "create_grant"
    | "update_grant"
    | "update_milestones"
    | "add_admin"
    | "remove_admin"
    | "update_transfer_party";
  resourceType: "expense" | "receipt" | "grant" | "admin" | "transfer_party";
  resourceId: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface GrantDisbursementDto {
  id: string;
  grantId: string;
  amount: string;
  txHash: string;
  blockNumber?: number;
  blockTimestamp?: number;
  createdAt?: string;
}

export interface GrantDisbursementCreatePayload {
  amount: string;
  txHash: string;
  blockNumber: number;
  blockTimestamp: number;
}

export interface GrantDisbursementUpdatePayload
  extends GrantDisbursementCreatePayload {}

export type GrantMilestoneStatus = "pending" | "completed" | "signed_off" | string;

export interface GrantMilestoneDto {
  id: string;
  grantId?: string;
  name: string;
  description: string;
  grantAmount: string;
  status?: GrantMilestoneStatus;
  completed: boolean;
  orderIndex?: number;
  signedOff: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface GrantMilestonesResponse {
  items: GrantMilestoneDto[];
  total: number;
}

export interface GrantDto {
  id: string;
  name: string;
  recipientName: string;
  description: string;
  teamUrl?: string | null;
  projectUrl?: string | null;
  status: string;
  recipientAddress: string;
  totalGrantAmount: string;
  initialGrantAmount: string;
  startDate: string;
  expectedCompletionDate: string;
  disbursements?: GrantDisbursementDto[] | null;
  fundsUsage?: ExpenseDto[] | null;
  amountGivenSoFar: string;
  milestones?: GrantMilestoneDto[] | null;
}

export interface AuthChallengeDto {
  message: string;
}

export interface AuthLoginResponseDto {
  token: string;
}

export interface OrganizationSettingsDto {
  name: string;
  receiptsEnabled: boolean;
}

export interface PaginationMetaDto {
  limit?: number;
  offset?: number;
  total?: number;
}

export interface ExpensePayload {
  item: string;
  quantity: number;
  price: string;
  purpose: string;
  category: string;
  date: string;
  txHash?: string | null;
}

export interface TransferPartyUpdatePayload {
  name: string;
}

export interface AdminCreatePayload {
  name: string;
  address: string;
}

export interface GrantPayload {
  name: string;
  recipientName: string;
  recipientAddress: string;
  description: string;
  teamUrl?: string | null;
  projectUrl?: string | null;
  status: string;
  totalGrantAmount: string;
  initialGrantAmount: string;
  startDate: string;
  expectedCompletionDate: string;
  milestones: Array<{
    name: string;
    description: string;
    grantAmount: string;
    completed?: boolean;
    signedOff?: boolean;
  }>;
  disbursements?: GrantDisbursementDto[];
  fundsUsage?: string[];
}

export interface GrantMilestoneUpdatePayload {
  milestones: Array<{
    id?: string;
    title: string;
    description: string;
    amount: string;
    status?: GrantMilestoneStatus;
    completed?: boolean;
    signedOff?: boolean;
  }>;
}

export interface GrantDisbursementPayload {
  amount: string;
  txHash: string;
}

export interface GrantFundsUsagePayload {
  item: string;
  quantity: number;
  price: string;
  purpose: string;
  category: string;
  date: string;
  txHash?: string | null;
}

export interface GrantFundsUsageUpdatePayload extends GrantFundsUsagePayload {}

export interface AuditLogQueryParams {
  limit?: number;
  offset?: number;
  adminAddress?: string;
  action?: AdminActionDto["action"];
  from?: string;
  to?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: PaginationMetaDto;
}

export interface MonthlyBudgetAllocationDto {
  id: string;
  manager: string | null;
  category: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyBudgetAllocationCreatePayload {
  manager: string | null;
  category: string;
  amount: string;
}

export interface MonthlyBudgetAllocationUpdatePayload {
  manager: string | null;
  category: string;
  amount: string;
}
