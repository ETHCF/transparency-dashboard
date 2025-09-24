import type { ReactNode } from "react";

import styles from "./AppFooter.module.css";

export interface AppFooterProps {
  children?: ReactNode;
  links?: Array<{ label: string; href: string }>;
}

export const AppFooter = ({ children, links }: AppFooterProps): JSX.Element => (
  <footer className={styles.footer}>
    <div>
      © {new Date().getFullYear()} Ethereum Community Foundation. All rights
      reserved.
    </div>
    {links ? (
      <div>
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={styles.link}
            target="_blank"
            rel="noreferrer"
          >
            {link.label}
          </a>
        ))}
      </div>
    ) : null}
    {children}
  </footer>
);
