import styles from "./AnnouncementBar.module.css";

export const AnnouncementBar = (): JSX.Element => (
  <a
    href="https://github.com/ETHCF/transparency-dashboard"
    className={styles.bar}
    target="_blank"
    rel="noreferrer"
  >
    The Ethereum Community Foundation treasury explorer is now live - built with
    Glassbox •{" "}
    <strong>View on Github</strong> ↗
  </a>
);
