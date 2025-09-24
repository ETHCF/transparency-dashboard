import { useCallback, useState } from "react";

type CopyState = "idle" | "copied" | "error";

export interface CopyButtonProps {
  value: string;
  children?: string;
}

export const CopyButton = ({
  value,
  children = "Copy",
}: CopyButtonProps): JSX.Element => {
  const [state, setState] = useState<CopyState>("idle");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch (error) {
      console.error("Copy failed", error);
      setState("error");
      setTimeout(() => setState("idle"), 2000);
    }
  }, [value]);

  return (
    <button type="button" onClick={handleCopy}>
      {state === "copied" ? "Copied" : children}
    </button>
  );
};
