import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Page.module.css";

export interface PageProps {
  children: ReactNode;
  className?: string;
}

export const Page = ({ children, className }: PageProps): JSX.Element => (
  <div className={clsx(styles.page, className)}>{children}</div>
);

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const PageHeader = ({
  title,
  description,
  actions,
}: PageHeaderProps): JSX.Element => (
  <header className={styles.pageHeader}>
    <div className={styles.pageHeaderContent}>
      <h1 className={styles.pageTitle}>{title}</h1>
      {description && <p className={styles.pageDescription}>{description}</p>}
    </div>
    {actions && <div className={styles.pageActions}>{actions}</div>}
  </header>
);

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const PageSection = ({
  title,
  description,
  actions,
  children,
  className,
}: PageSectionProps): JSX.Element => (
  <section className={clsx(styles.section, className)}>
    {title || description || actions ? (
      <header className={styles.sectionHeader}>
        <div>
          {title ? <h2 className={styles.sectionTitle}>{title}</h2> : null}
          {description ? (
            <p className={styles.sectionDescription}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className={styles.inlineActions}>{actions}</div> : null}
      </header>
    ) : null}
    {children}
  </section>
);

export interface PageGridProps {
  children: ReactNode;
  className?: string;
  columns?: string;
}

export const PageGrid = ({
  children,
  className,
  columns,
}: PageGridProps): JSX.Element => (
  <div
    className={clsx(styles.grid, className)}
    style={columns ? { gridTemplateColumns: columns } : undefined}
  >
    {children}
  </div>
);
