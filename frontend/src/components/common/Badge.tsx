import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Badge.module.css";

export type BadgeTone = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export const Badge = ({
  children,
  tone = "default",
  className,
}: BadgeProps): JSX.Element => {
  const toneClass = tone !== "default" ? styles[tone] : undefined;

  return (
    <span className={clsx(styles.badge, toneClass, className)}>{children}</span>
  );
};
