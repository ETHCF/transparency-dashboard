import styles from "./PaginationControls.module.css";

export interface PaginationControlsProps {
  page: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  canNext?: boolean;
  canPrev?: boolean;
}

export const PaginationControls = ({
  page,
  totalPages,
  onPageChange,
  canNext = true,
  canPrev = true,
}: PaginationControlsProps): JSX.Element => (
  <div className={styles.controls}>
    <button
      type="button"
      className={styles.button}
      onClick={() => onPageChange(page - 1)}
      disabled={!canPrev || page <= 1}
    >
      Previous
    </button>
    <span className={styles.label}>
      Page {page}
      {totalPages ? ` of ${totalPages}` : ""}
    </span>
    <button
      type="button"
      className={styles.button}
      onClick={() => onPageChange(page + 1)}
      disabled={!canNext}
    >
      Next
    </button>
  </div>
);
