import type {
  AdminActionDto,
  ExpenseDto,
  GrantDisbursementDto,
  GrantDto,
  GrantMilestoneDto,
  GrantMilestonesResponse,
  TransferDto,
  TreasuryAssetDto,
  TreasuryResponseDto,
  TreasuryWalletBalanceDto,
  TreasuryWalletDto,
} from "@/types/api";
import type {
  AuditLogEntry,
  Expense,
  GrantDisbursement,
  Grant,
  GrantMilestone,
  TransferRecord,
  TreasuryOverview,
  TreasuryWallet,
} from "@/types/domain";
import { buildExplorerUrl } from "@/utils/eth";

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number.parseFloat(String(value ?? 0));
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toDate = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return new Date(0);
  }

  const normalizeNumeric = (input: number) => {
    if (!Number.isFinite(input)) {
      return NaN;
    }

    const milliseconds = input > 1e12 ? input : input * 1000;
    return milliseconds;
  };

  if (typeof value === "number") {
    const millis = normalizeNumeric(value);
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return new Date(0);
  }

  const asNumber = Number.parseFloat(trimmed);
  if (!Number.isNaN(asNumber) && trimmed === String(asNumber)) {
    const millis = normalizeNumeric(asNumber);
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const ensureArray = <T>(items: T[] | null | undefined): T[] =>
  Array.isArray(items) ? items : [];

const resolveName = (
  ...names: Array<string | null | undefined>
): string => {
  for (const name of names) {
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed && trimmed.toLowerCase() !== "unknown") {
        return trimmed;
      }
    }
  }

  const fallback = names.find((name) => typeof name === "string" && name.trim());
  return fallback ? fallback.trim() : "Unknown";
};

const resolveAddress = (
  ...addresses: Array<string | null | undefined>
): string | undefined => {
  for (const address of addresses) {
    if (typeof address === "string" && address.trim()) {
      return address.trim();
    }
  }

  return undefined;
};

const resolveAssetSymbol = (
  ...symbols: Array<string | null | undefined>
): string | undefined => {
  for (const symbol of symbols) {
    if (typeof symbol === "string") {
      const trimmed = symbol.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return undefined;
};

const ETH_PLACEHOLDER_ADDRESS =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

const resolveKnownSymbol = (address?: string) => {
  const normalized = address?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized === ETH_PLACEHOLDER_ADDRESS) {
    return "ETH";
  }

  return undefined;
};

const resolveBalanceSymbol = (
  address: string | undefined,
  metadata?: TreasuryAssetDto,
  balance?: TreasuryWalletBalanceDto,
) =>
  balance?.assetSymbol?.trim() ||
  metadata?.symbol?.trim() ||
  resolveKnownSymbol(address);

const resolveBalanceName = (
  address: string | undefined,
  metadata?: TreasuryAssetDto,
  balance?: TreasuryWalletBalanceDto,
) => {
  const symbol = resolveBalanceSymbol(address, metadata, balance);
  if (symbol) {
    return symbol;
  }

  const fromPayload = balance?.assetName?.trim() || metadata?.name?.trim();
  if (fromPayload) {
    return fromPayload;
  }

  if (address) {
    return address;
  }

  return "Unknown asset";
};

const buildAssetIndex = (assets: TreasuryAssetDto[]) => {
  const map = new Map<string, TreasuryAssetDto>();
  assets.forEach((asset) => {
    if (asset.address) {
      map.set(asset.address.toLowerCase(), asset);
    }
  });
  return map;
};

const aggregateWalletBalances = (
  balances: TreasuryWalletBalanceDto[],
  assetIndex: Map<string, TreasuryAssetDto>,
) => {
  const aggregated = new Map<
    string,
    {
      name: string;
      symbol?: string;
      amount: number;
      usdWorth: number;
      ethWorth: number;
      address?: string;
      decimals?: number;
    }
  >();

  balances.forEach((balance) => {
    if (!balance) {
      return;
    }

    const rawAddress = balance.address;
    const key = typeof rawAddress === "string" ? rawAddress.toLowerCase() : undefined;

    if (!key) {
      return;
    }

    const metadata = assetIndex.get(key);
    const symbol = resolveBalanceSymbol(rawAddress, metadata, balance);
    const name = resolveBalanceName(rawAddress, metadata, balance);

    const decimalsValue =
      metadata?.decimals !== undefined && metadata?.decimals !== null
        ? Number(metadata.decimals)
        : undefined;
    const decimals = Number.isFinite(decimalsValue ?? NaN)
      ? decimalsValue
      : undefined;

    const existing = aggregated.get(key) ?? {
      name,
      symbol,
      amount: 0,
      usdWorth: 0,
      ethWorth: 0,
      address: rawAddress,
      decimals,
    };

    existing.amount += toNumber(balance.amount);
    existing.usdWorth += toNumber(balance.usdWorth);
    existing.ethWorth += toNumber(balance.ethWorth);

    if (symbol && !existing.symbol) {
      existing.symbol = symbol;
    }

    if (
      name &&
      (!existing.name || existing.name.toLowerCase() === existing.address?.toLowerCase())
    ) {
      existing.name = name;
    }

    if (!existing.name) {
      existing.name = name;
    }

    if (decimals !== undefined && existing.decimals === undefined) {
      existing.decimals = decimals;
    }

    aggregated.set(key, existing);
  });

  return Array.from(aggregated.values());
};

export const mapTreasuryResponse = (
  dto: TreasuryResponseDto,
): TreasuryOverview => {
  const assets = ensureArray(dto.assets);
  const walletBalances = ensureArray(dto.walletBalances);
  const assetIndex = buildAssetIndex(assets);

  const aggregatedAssets = walletBalances.length
    ? aggregateWalletBalances(walletBalances, assetIndex).sort(
        (a, b) => b.usdWorth - a.usdWorth,
      )
    : assets.map((asset) => ({
        name: asset.symbol ?? asset.name,
        symbol: asset.symbol,
        amount: toNumber(asset.amount),
        usdWorth: toNumber(asset.usdWorth),
        ethWorth: toNumber(asset.ethWorth),
        address: asset.address,
        decimals:
          asset.decimals !== undefined && asset.decimals !== null &&
          Number.isFinite(Number(asset.decimals))
            ? Number(asset.decimals)
            : undefined,
      })).sort((a, b) => b.usdWorth - a.usdWorth);

  const aggregatedEthTotal = walletBalances.length
    ? walletBalances.reduce(
        (acc, balance) => acc + toNumber(balance.ethWorth),
        0,
      )
    : undefined;

  return {
    organizationName: dto.organizationName ?? "",
    totalValueUsd: toNumber(dto.totalValueUsd),
    totalValueEth:
      aggregatedEthTotal !== undefined
        ? aggregatedEthTotal
        : toNumber(dto.totalValueEth),
    totalFundsRaised: toNumber(dto.totalFundsRaised),
    totalFundsRaisedUnit: dto.totalFundsRaisedUnit ?? "USD",
    lastUpdated: toDate(dto.lastUpdated),
    assets: aggregatedAssets,
    wallets: mapTreasuryWallets(dto.wallets),
  };
};

export const mapTreasuryWallet = (wallet: TreasuryWalletDto): TreasuryWallet => ({
  address: wallet.address,
  etherscanUrl:
    wallet.etherscanLink ?? buildExplorerUrl("address", wallet.address),
});

export const mapTreasuryWallets = (
  wallets?: TreasuryWalletDto[] | null,
): TreasuryWallet[] => ensureArray(wallets).map(mapTreasuryWallet);

export const mapTransfer = (dto: TransferDto): TransferRecord => ({
  id: dto.txHash,
  chain: dto.chain,
  txHash: dto.txHash,
  etherscanUrl: dto.etherscanLink || buildExplorerUrl("tx", dto.txHash),
  direction: dto.direction,
  payerName: resolveName(dto.payer_name, dto.payerName, dto.payer?.name),
  payerAddress: resolveAddress(
    dto.payer_address,
    dto.payerAddress,
    dto.payer?.address,
  ),
  payeeName: resolveName(dto.payee_name, dto.payeeName, dto.payee?.name),
  payeeAddress: resolveAddress(
    dto.payee_address,
    dto.payeeAddress,
    dto.payee?.address,
  ),
  assetSymbol: resolveAssetSymbol(dto.assetSymbol, dto.asset_symbol),
  timestamp: toDate(dto.timestamp ?? dto.blockTimestamp),
  blockNumber: dto.blockNumber,
  asset: dto.asset,
  amount: toNumber(dto.amount),
});

export const mapExpense = (dto: ExpenseDto): Expense => ({
  ...dto,
  price: toNumber(dto.price),
  date: new Date(dto.date),
  receipts: ensureArray(dto.receipts).map((receipt) => ({
    id: receipt.uuid,
    name: receipt.name,
    downloadUrl: receipt.downloadUrl,
  })),
});

export const mapGrantDisbursement = (
  dto: GrantDisbursementDto,
): GrantDisbursement => ({
  ...dto,
  amount: toNumber(dto.amount),
  blockNumber:
    dto.blockNumber !== undefined && dto.blockNumber !== null
      ? Number(dto.blockNumber)
      : undefined,
  blockTimestamp:
    dto.blockTimestamp !== undefined && dto.blockTimestamp !== null
      ? Number(dto.blockTimestamp)
      : undefined,
  createdAt: dto.createdAt ? toDate(dto.createdAt) : undefined,
});

export const mapGrantDisbursements = (
  disbursements?: GrantDisbursementDto[] | null,
): GrantDisbursement[] => ensureArray(disbursements).map(mapGrantDisbursement);

export const mapGrant = (dto: GrantDto): Grant => ({
  ...dto,
  startDate: toDate(dto.startDate),
  expectedCompletionDate: toDate(dto.expectedCompletionDate),
  amountGivenSoFar: toNumber(dto.amountGivenSoFar),
  totalGrantAmount: toNumber(dto.totalGrantAmount),
  initialGrantAmount: toNumber(dto.initialGrantAmount),
  milestones: ensureArray(dto.milestones).map(mapGrantMilestone),
  disbursements: mapGrantDisbursements(dto.disbursements),
  fundsUsage: ensureArray(dto.fundsUsage).map(mapExpense),
});

export const mapGrantMilestone = (
  milestone: GrantMilestoneDto,
): GrantMilestone => ({
  ...milestone,
  grantAmount: toNumber(milestone.grantAmount),
  orderIndex:
    milestone.orderIndex !== undefined && milestone.orderIndex !== null
      ? Number(milestone.orderIndex)
      : undefined,
  createdAt: milestone.createdAt ? toDate(milestone.createdAt) : undefined,
  updatedAt: milestone.updatedAt ? toDate(milestone.updatedAt) : undefined,
});

export const mapGrantMilestonesResponse = (
  response: GrantMilestonesResponse | GrantMilestoneDto[],
): GrantMilestone[] => {
  if (Array.isArray(response)) {
    return ensureArray(response).map(mapGrantMilestone);
  }

  return ensureArray(response.items).map(mapGrantMilestone);
};

export const mapAuditLogEntry = (dto: AdminActionDto): AuditLogEntry => ({
  ...dto,
  timestamp: new Date(dto.timestamp),
});
