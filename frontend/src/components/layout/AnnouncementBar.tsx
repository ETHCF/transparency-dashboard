import styles from "./AnnouncementBar.module.css";

export const AnnouncementBar = (): JSX.Element => (
  <a
    href="https://github.com/ETHCF/transparency-dashboard"
    className={styles.bar}
    target="_blank"
    rel="noreferrer"
  >
    Glassbox - the open source treasury explorer is now live •{" "}
    <strong>View on Github</strong> ↗
  </a>
);
