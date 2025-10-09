import { useQuery } from "@tanstack/react-query";

import { apiRequest } from "@/services/api-client";
import { queryKeys } from "@/services/query-keys";
import type { CategoryDto } from "@/types/api";

export const fetchCategories = async (): Promise<CategoryDto[]> => {
  const response = await apiRequest<CategoryDto[]>("categories");
  return response;
};

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: queryKeys.categories(),
    queryFn: fetchCategories,
  });
