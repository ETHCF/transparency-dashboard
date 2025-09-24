import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./StatCard.module.css";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  className?: string;
}

export const StatCard = ({
  label,
  value,
  caption,
  className,
}: StatCardProps): JSX.Element => (
  <div className={clsx(styles.card, className)}>
    <span className={styles.label}>{label}</span>
    <div className={styles.value}>{value}</div>
    {caption ? <span className={styles.caption}>{caption}</span> : null}
  </div>
);
