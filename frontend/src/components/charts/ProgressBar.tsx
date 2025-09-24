import styles from "./ProgressBar.module.css";

export interface ProgressBarProps {
  value: number;
  label?: string;
  sublabel?: string;
}

export const ProgressBar = ({
  value,
  label,
  sublabel,
}: ProgressBarProps): JSX.Element => {
  const clamped = Math.min(Math.max(value, 0), 100);

  return (
    <div className={styles.wrapper}>
      {label || sublabel ? (
        <div className={styles.label}>
          <span>{label}</span>
          <span>{sublabel ?? `${clamped.toFixed(0)}%`}</span>
        </div>
      ) : null}
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
};
