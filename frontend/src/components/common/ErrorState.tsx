import type { ReactNode } from "react";

import styles from "./ErrorState.module.css";

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
}

export const ErrorState = ({
  title = "Something went wrong",
  description,
  action,
}: ErrorStateProps): JSX.Element => (
  <div className={styles.wrapper} role="alert">
    <span className={styles.title}>{title}</span>
    {description ? (
      <div className={styles.description}>{description}</div>
    ) : null}
    {action}
  </div>
);
