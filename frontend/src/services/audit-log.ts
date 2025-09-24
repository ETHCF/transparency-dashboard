import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { mapAuditLogEntry } from "@/services/mappers";
import { queryKeys } from "@/services/query-keys";
import type { AdminActionDto, AuditLogQueryParams } from "@/types/api";
import type { AuditLogEntry } from "@/types/domain";

export const fetchAuditLog = async (
  params: AuditLogQueryParams = {},
): Promise<AuditLogEntry[]> => {
  const response = await apiRequest<AdminActionDto[]>("admin-actions", {
    query: params,
  });
  return response.map(mapAuditLogEntry);
};

export const useAuditLogQuery = (params: AuditLogQueryParams = {}) =>
  useQuery({
    queryKey: queryKeys.auditLog(params),
    queryFn: () => fetchAuditLog(params),
  });
