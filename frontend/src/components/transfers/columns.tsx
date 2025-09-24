import { AddressLink } from "@/components/common/AddressLink";
import { StatusPill } from "@/components/common/StatusPill";
import type { ColumnDef } from "@/components/table/DataTable";
import type { TransferRecord } from "@/types/domain";
import { formatTokenAmount } from "@/utils/format";

const renderTransferParty = (
  name: string,
  address: string | null | undefined,
  isTreasuryWallet: (address?: string | null) => boolean,
) => {
  const trimmed = name?.trim();
  const isUnknown = !trimmed || trimmed.toLowerCase() === "unknown";
  const displayName = isUnknown
    ? isTreasuryWallet(address)
      ? "Treasury"
      : "Unknown"
    : trimmed;

  if (!address) {
    return displayName;
  }

  return <AddressLink address={address} label={displayName} />;
};

export const createTransferColumns = (
  isTreasuryWallet: (address?: string | null) => boolean,
  getAssetDecimals: (transfer: TransferRecord) => number | undefined,
): ColumnDef<TransferRecord>[] => [
  {
    key: "txHash",
    header: "Transaction",
    render: (transfer) => {
      const label = `${transfer.txHash.slice(0, 10)}…`;
      if (!transfer.etherscanUrl) {
        return label;
      }

      return (
        <a
          href={transfer.etherscanUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {label}
        </a>
      );
    },
  },
  {
    key: "direction",
    header: "Direction",
    render: (transfer) => (
      <StatusPill
        status={transfer.direction}
        variant={transfer.direction === "incoming" ? "success" : "warning"}
      />
    ),
  },
  {
    key: "payerName",
    header: "Payer",
    render: (transfer) =>
      renderTransferParty(
        transfer.payerName,
        transfer.payerAddress,
        isTreasuryWallet,
      ),
  },
  {
    key: "payeeName",
    header: "Payee",
    render: (transfer) =>
      renderTransferParty(
        transfer.payeeName,
        transfer.payeeAddress,
        isTreasuryWallet,
      ),
  },
  {
    key: "amount",
    header: "Amount",
    render: (transfer) => {
      const decimals = getAssetDecimals(transfer) ?? 18;
      const divisor = 10 ** decimals;
      const normalizedAmount = divisor ? transfer.amount / divisor : transfer.amount;
      return formatTokenAmount(
        normalizedAmount,
        transfer.assetSymbol ?? transfer.asset,
      );
    },
    align: "right",
  },
];
