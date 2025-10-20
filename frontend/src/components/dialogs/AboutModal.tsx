import { useState } from "react";
import styles from "./AboutModal.module.css";

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal = ({ isOpen, onClose }: AboutModalProps): JSX.Element | null => {
  const [activeTab, setActiveTab] = useState<"info" | "faq">("info");

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>What is this?</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "info" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("info")}
          >
            Info
          </button>
          <button
            className={`${styles.tab} ${activeTab === "faq" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("faq")}
          >
            FAQ
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === "info" && (
            <div className={styles.infoTab}>
              <div className={styles.videoContainer}>
                <div className={styles.videoBackground}>glassbox</div>
                <video
                  className={styles.video}
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src="/glassbox.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className={styles.description}>
                <h3>The Ethereum Community Foundation Treasury Explorer</h3>
                <p>
                  Built with Glassbox - open-source treasury transparency software for Ethereum-based DAOs and foundations.
                </p>

                <h4>Features</h4>
                <ul>
                  <li><strong>Real-time blockchain integration</strong> via Alchemy API</li>
                  <li><strong>Multi-signature wallet support</strong> (Gnosis Safe)</li>
                  <li><strong>ETH and ERC-20 token tracking</strong></li>
                  <li><strong>Budget management</strong> with variance analysis</li>
                  <li><strong>Grant and expense tracking</strong></li>
                  <li><strong>Multi-format export</strong> (CSV, JSON, PDF)</li>
                  <li><strong>Role-based access control</strong></li>
                  <li><strong>SIWE authentication</strong></li>
                  <li><strong>Burn rate analysis</strong> and runway projections</li>
                  <li><strong>90-day historical data</strong></li>
                </ul>
              </div>

              <a
                href="https://github.com/ETHCF/transparency-dashboard"
                target="_blank"
                rel="noreferrer"
                className={styles.githubButton}
              >
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          )}

          {activeTab === "faq" && (
            <div className={styles.faqTab}>
              <div className={styles.faqItem}>
                <h4>What is Glassbox?</h4>
                <p>
                  Glassbox is an open-source treasury management and transparency dashboard designed specifically for Ethereum-based DAOs and foundations. It provides real-time visibility into treasury operations, transactions, and financial health.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h4>Is Glassbox free to use?</h4>
                <p>
                  Yes! Glassbox is fully open source and free to use. You can deploy your own instance or contribute to the project on{" "}
                  <a href="https://github.com/ETHCF/transparency-dashboard" target="_blank" rel="noreferrer">
                    GitHub
                  </a>.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h4>What blockchains does Glassbox support?</h4>
                <p>
                  Currently, Glassbox supports Ethereum mainnet with real-time integration via Alchemy API. Support for additional networks may be added in future releases.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h4>How do I get started?</h4>
                <p>
                  Visit our{" "}
                  <a href="https://github.com/ETHCF/transparency-dashboard" target="_blank" rel="noreferrer">
                    GitHub repository
                  </a>{" "}
                  to access the source code, deployment instructions, and documentation. The project includes both backend and frontend components that can be deployed to your infrastructure of choice.
                </p>
              </div>

              <div className={styles.faqItem}>
                <h4>Can I customize Glassbox for my organization?</h4>
                <p>
                  Absolutely! As an open-source project, you can{" "}
                  <a href="https://github.com/ETHCF/transparency-dashboard/fork" target="_blank" rel="noreferrer">
                    fork
                  </a>{" "}
                  and customize Glassbox to meet your organization's specific needs. The codebase is designed to be extensible and configurable.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
