import * as SelectPrimitive from "@radix-ui/react-select";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./Select.module.css";

export interface SelectOption {
  label: ReactNode;
  value: string;
}

export interface SelectFieldProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  error?: boolean;
}

export const SelectField = ({
  value,
  onChange,
  placeholder,
  options,
}: SelectFieldProps): JSX.Element => {
  // Convert empty string to undefined for Radix UI Select
  const selectValue = value === "" ? undefined : value;

  return (
    <SelectPrimitive.Root value={selectValue} onValueChange={onChange}>
      <SelectPrimitive.Trigger className={clsx(styles.trigger)}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>▾</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className={styles.content}>
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={styles.item}
              >
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
};
