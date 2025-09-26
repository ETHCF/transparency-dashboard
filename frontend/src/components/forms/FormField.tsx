import type { ReactNode } from "react";

import styles from "./FormField.module.css";

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
}

export const FormField = ({
  label,
  children,
  hint,
  error,
  optional,
}: FormFieldProps): JSX.Element => (
  <label className={styles.field}>
    <span className={styles.labelRow}>
      <span className={styles.label}>{label}</span>
      {optional ? <span className={styles.optional}>Optional</span> : null}
    </span>
    {children}
    {hint && !error ? <span className={styles.hint}>{hint}</span> : null}
    {error ? <span className={styles.error}>{error}</span> : null}
    <span className="buttonspace"></span>
  </label>
);
