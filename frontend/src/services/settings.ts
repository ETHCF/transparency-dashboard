import { useMutation } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";

export const updateOrganizationName = (name: string) =>
  apiRequest<{ name: string }>("settings/name", {
    method: "POST",
    body: { name },
  });

export const useUpdateOrganizationNameMutation = () =>
  useMutation({
    mutationFn: ({ name }: { name: string }) => updateOrganizationName(name),
  });
