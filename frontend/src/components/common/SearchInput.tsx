import type { ChangeEvent } from "react";

import styles from "./SearchInput.module.css";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder,
}: SearchInputProps): JSX.Element => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.icon}>🔍</span>
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={styles.input}
        type="search"
      />
      {value ? (
        <button
          type="button"
          className={styles.clearButton}
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
};
