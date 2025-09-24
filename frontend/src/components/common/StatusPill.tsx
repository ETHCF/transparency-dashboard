import { Badge } from "@/components/common/Badge";

export type StatusTone = "success" | "warning" | "danger" | "info" | "default";

export interface StatusPillProps {
  status: string;
  variant?: StatusTone;
}

export const StatusPill = ({
  status,
  variant = "default",
}: StatusPillProps): JSX.Element => <Badge tone={variant}>{status}</Badge>;
