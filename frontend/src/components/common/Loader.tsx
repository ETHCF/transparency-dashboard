import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Loader.module.css";

export interface LoaderProps {
  label?: ReactNode;
  inline?: boolean;
  className?: string;
}

export const Loader = ({
  label,
  inline,
  className,
}: LoaderProps): JSX.Element => {
  const spinner = (
    <span className={clsx(styles.loader, className)} aria-hidden="true" />
  );

  if (inline) {
    return <>{spinner}</>;
  }

  return (
    <div className={styles.wrapper} role="status">
      {spinner}
      {label ? <span>{label}</span> : null}
    </div>
  );
};
