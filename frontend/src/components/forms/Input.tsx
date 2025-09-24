import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";

import styles from "./Input.module.css";

export interface InputProps extends ComponentPropsWithoutRef<"input"> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className, ...props }, ref) => (
    <input
      {...props}
      ref={ref}
      className={clsx(styles.input, error && styles.inputError, className)}
    />
  ),
);

Input.displayName = "Input";
