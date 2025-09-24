import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { Loader } from "@/components/common/Loader";
import { Page, PageSection } from "@/components/layout/Page";
import { useExpenseQuery } from "@/services/expenses";
import { formatCurrency, formatDate } from "@/utils/format";

const ExpenseDetailPage = () => {
  const { expenseId } = Route.useParams();
  const expenseQuery = useExpenseQuery(expenseId);

  if (expenseQuery.isPending) {
    return <Loader label="Loading expense" />;
  }

  if (expenseQuery.isError || !expenseQuery.data) {
    return (
      <ErrorState
        title="Unable to load expense"
        description={expenseQuery.error?.message}
      />
    );
  }

  const expense = expenseQuery.data;

  return (
    <Page>
      <PageSection title={expense.item} description={expense.purpose}>
        <ul>
          <li>Date: {formatDate(expense.date)}</li>
          <li>Category: {expense.category}</li>
          <li>Quantity: {expense.quantity}</li>
          <li>Total: {formatCurrency(expense.price * expense.quantity)}</li>
          {expense.txHash ? <li>Tx Hash: {expense.txHash}</li> : null}
        </ul>
      </PageSection>

      <PageSection title="Receipts">
        {expense.receipts.length === 0 ? (
          <EmptyState title="No receipts uploaded" />
        ) : (
          <ul>
            {expense.receipts.map((receipt) => (
              <li key={receipt.id}>
                <a href={receipt.downloadUrl} target="_blank" rel="noreferrer">
                  {receipt.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/expense/$expenseId")({
  component: ExpenseDetailPage,
});
