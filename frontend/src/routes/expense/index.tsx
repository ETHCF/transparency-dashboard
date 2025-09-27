import { createFileRoute } from "@tanstack/react-router";
import { useExpensesQuery } from "@/services/expenses";
import { Page, PageHeader, PageSection } from "@/components/layout/Page";
import { DataTable } from "@/components/table/DataTable";
import { Loader } from "@/components/common/Loader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { Link } from "@tanstack/react-router";
import { formatCurrency, formatDate } from "@/utils/format";
import type { Expense } from "@/types/domain";
import type { ColumnDef } from "@/components/table/DataTable";

const expenseColumns: ColumnDef<Expense>[] = [
  {
    key: "item",
    header: "Item",
    render: (expense) => (
      <Link to={`/expense/${expense.id}`} className="link-primary">
        {expense.item}
      </Link>
    )
  },
  {
    key: "category",
    header: "Category",
    render: (expense) => (
      <span className="category-badge">{expense.category}</span>
    ),
  },
  {
    key: "quantity",
    header: "Qty",
    align: "right",
  },
  {
    key: "price",
    header: "Price",
    render: (expense) => formatCurrency(expense.price),
    align: "right",
  },
  {
    key: "total",
    header: "Total",
    render: (expense) => formatCurrency(expense.price * expense.quantity),
    align: "right",
  },
  {
    key: "date",
    header: "Date",
    render: (expense) => expense.date ? formatDate(expense.date) : "-",
  },
  {
    key: "txHash",
    header: "Transaction",
    render: (expense) => expense.txHash ? (
      <a
        href={`https://etherscan.io/tx/${expense.txHash}`}
        target="_blank"
        rel="noreferrer"
        className="link-external"
      >
        View
      </a>
    ) : (
      "-"
    ),
  },
];

const ExpensesPage = () => {
  const { data: expenses, isLoading, error } = useExpensesQuery({});

  if (isLoading) {
    return (
      <Page>
        <Loader label="Loading expenses" />
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <ErrorState
          title="Unable to load expenses"
          description={error.message || "An error occurred while loading expenses"}
        />
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Expenses"
        description="View all organizational expenses and their details"
      />
      <PageSection>
        {expenses && expenses.length > 0 ? (
          <DataTable
            columns={expenseColumns}
            data={expenses}
            keyExtractor={(expense) => expense.id}
          />
        ) : (
          <EmptyState
            title="No expenses found"
            description="There are no expenses to display at this time"
          />
        )}
      </PageSection>
    </Page>
  );
};

export const Route = createFileRoute("/expense/")({
  component: ExpensesPage,
});