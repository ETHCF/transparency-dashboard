import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";

import styles from "./TextArea.module.css";

export interface TextAreaProps extends ComponentPropsWithoutRef<"textarea"> {
  error?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ error, className, ...props }, ref) => (
    <textarea
      {...props}
      ref={ref}
      className={clsx(
        styles.textarea,
        error && styles.textareaError,
        className,
      )}
    />
  ),
);

TextArea.displayName = "TextArea";
