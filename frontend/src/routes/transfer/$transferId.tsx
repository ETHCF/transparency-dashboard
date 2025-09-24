import { createFileRoute } from "@tanstack/react-router";

import { AddressLink } from "@/components/common/AddressLink";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { Page, PageSection } from "@/components/layout/Page";
import { useTransferQuery } from "@/services/transfers";
import { formatDate, formatTokenAmount } from "@/utils/format";
import { buildExplorerUrl } from "@/utils/eth";

const TransferDetailPage = () => {
  const { transferId } = Route.useParams();
  const transferQuery = useTransferQuery(transferId);

  if (transferQuery.isPending) {
    return <Loader label="Loading transfer" />;
  }

  if (transferQuery.isError || !transferQuery.data) {
    return (
      <ErrorState
        title="Unable to load transfer"
        description={transferQuery.error?.message}
      />
    );
  }

  const transfer = transferQuery.data;

  const renderParty = (name: string, address?: string | null) => {
    const trimmed = name?.trim() || "Unknown";
    const displayName =
      trimmed.toLowerCase() === "unknown" ? "Unknown" : trimmed;

    if (!address) {
      return displayName;
    }

    return <AddressLink address={address} label={displayName} />;
  };

  return (
    <Page>
      <PageSection title="Transfer Summary">
        <dl>
          <div>
            <dt>Transaction Hash</dt>
            <dd>
              <a
                href={buildExplorerUrl("tx", transfer.txHash)}
                target="_blank"
                rel="noreferrer"
              >
                {transfer.txHash}
              </a>
            </dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>{formatDate(transfer.timestamp)}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>
              {formatTokenAmount(
                transfer.amount,
                transfer.assetSymbol ?? transfer.asset,
              )}
            </dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{transfer.direction}</dd>
          </div>
        </dl>
      </PageSection>

      <PageSection title="Parties">
        <p>
          Payer:{" "}
          {renderParty(transfer.payerName, transfer.payerAddress)}
        </p>
        <p>
          Payee:{" "}
          {renderParty(transfer.payeeName, transfer.payeeAddress)}
        </p>
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/transfer/$transferId")({
  component: TransferDetailPage,
});
