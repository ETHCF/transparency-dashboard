import clsx from "clsx";

import styles from "./ProgressCircle.module.css";

export interface ProgressCircleProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export const ProgressCircle = ({
  value,
  size = 120,
  strokeWidth = 10,
  label,
}: ProgressCircleProps): JSX.Element => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={styles.wrapper}>
      <svg className={styles.svg} width={size} height={size}>
        <circle
          stroke="rgba(255, 255, 255, 0.12)"
          fill="transparent"
          strokeWidth={strokeWidth}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          stroke="var(--color-primary)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className={styles.value}
        >
          {clampedValue.toFixed(0)}%
        </text>
      </svg>
      {label ? <span className={clsx(styles.label)}>{label}</span> : null}
    </div>
  );
};
