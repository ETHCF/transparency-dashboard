import { useState } from "react";

export interface PaginationState {
  page: number;
  pageSize: number;
}

export const usePagination = (initialPageSize = 20) => {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
  });

  const setPage = (page: number) =>
    setState((current) => ({ ...current, page: Math.max(page, 1) }));

  return {
    page: state.page,
    pageSize: state.pageSize,
    setPage,
    setPageSize: (pageSize: number) =>
      setState((current) => ({ ...current, pageSize })),
    offset: (state.page - 1) * state.pageSize,
  };
};
