import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";

import { Input } from "@/components/forms/Input";

export interface DatePickerProps extends ComponentPropsWithoutRef<"input"> {
  error?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ error, ...props }, ref) => (
    <Input {...props} type="date" ref={ref} error={error} />
  ),
);

DatePicker.displayName = "DatePicker";
