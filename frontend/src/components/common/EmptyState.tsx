import type { ReactNode } from "react";

import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element => (
  <div className={styles.wrapper}>
    <span className={styles.title}>{title}</span>
    {description ? <div>{description}</div> : null}
    {action}
  </div>
);
