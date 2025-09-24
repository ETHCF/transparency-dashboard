import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Table.module.css";

export interface ColumnDef<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  emptyState?: ReactNode;
}

export const DataTable = <T,>({
  columns,
  data,
  getRowId,
  onRowClick,
  emptyState,
}: DataTableProps<T>): JSX.Element => {
  if (data.length === 0) {
    return (
      <div className={styles.empty}>{emptyState ?? "No records found"}</div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(
                  styles.headerCell,
                  column.align === "right" && styles.numeric,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const id = getRowId(row, rowIndex);
            return (
              <tr
                key={id}
                className={styles.row}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={`${id}-${column.key}`}
                    className={clsx(
                      styles.cell,
                      column.align === "right" && styles.numeric,
                      column.align === "center" && styles.center,
                    )}
                  >
                    {column.render
                      ? column.render(row)
                      : ((row as Record<string, unknown>)[
                          column.key
                        ] as ReactNode)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
